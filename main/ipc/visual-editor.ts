import { ipcMain, BrowserWindow } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import { IPC_CHANNELS } from '../../shared/types';
import type { VisualAction } from '../../shared/types';
import { log } from '../helpers/logger';
import { logSecurityEvent } from '../helpers/security-logger';
import { isPathSafe } from '../helpers/path-safety';
import { buildVisualEditPrompt } from '../helpers/prompt-builder';
import { cleanEnv } from './terminal';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty = require('node-pty');

// Active PTY processes for visual editor executions
const activeProcesses = new Map<string, ReturnType<typeof import('node-pty').spawn>>();

// Overlay script content, read once on registration
let overlayScript: string = '';

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

function pushUpdate(channel: string, data: unknown) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

export function registerVisualEditorHandlers() {
  // Pre-load overlay script
  const overlayPath = path.join(__dirname, '..', 'scripts', 'overlay.js');
  fs.readFile(overlayPath, 'utf-8')
    .then((content) => {
      overlayScript = content;
      log('info', 'visual-editor', `Loaded overlay script (${content.length} bytes)`);
    })
    .catch((err) => {
      log('warn', 'visual-editor', 'Failed to load overlay script', err);
    });

  // Inject overlay into preview iframe
  ipcMain.handle(IPC_CHANNELS.VISUAL_EDITOR_INJECT, async (_, projectPath: string) => {
    if (!isPathSafe(projectPath)) {
      logSecurityEvent('path-traversal', 'high', 'Visual editor inject blocked for unsafe path', { projectPath });
      return { error: 'Access denied: project path is outside the home directory' };
    }

    if (!overlayScript) {
      // Try loading again if not cached
      try {
        const overlayPath = path.join(__dirname, '..', 'scripts', 'overlay.js');
        overlayScript = await fs.readFile(overlayPath, 'utf-8');
      } catch (err) {
        log('error', 'visual-editor', 'Failed to read overlay script', err);
        return { error: 'Overlay script not found' };
      }
    }

    log('info', 'visual-editor', `Injecting overlay for project: ${projectPath}`);
    return { script: overlayScript };
  });

  // Remove overlay from preview iframe
  ipcMain.handle(IPC_CHANNELS.VISUAL_EDITOR_REMOVE, async () => {
    log('info', 'visual-editor', 'Removing overlay');
    return { cleanup: 'window.__formaOverlayCleanup && window.__formaOverlayCleanup()' };
  });

  // Create a git stash checkpoint
  ipcMain.handle(IPC_CHANNELS.VISUAL_EDITOR_CHECKPOINT, async (_, projectPath: string, checkpointId: string) => {
    if (!isPathSafe(projectPath)) {
      logSecurityEvent('path-traversal', 'high', 'Visual editor checkpoint blocked for unsafe path', { projectPath });
      return { error: 'Access denied: project path is outside the home directory' };
    }

    log('info', 'visual-editor', `Creating checkpoint ${checkpointId} for ${projectPath}`);
    const git = simpleGit({ baseDir: projectPath, timeout: { block: 10000 } });
    const result = await git.stash(['push', '-m', `forma-checkpoint-${checkpointId}`, '--include-untracked']);
    return { stashRef: result, checkpointId };
  });

  // Undo: pop the most recent stash
  ipcMain.handle(IPC_CHANNELS.VISUAL_EDITOR_UNDO, async (_, projectPath: string) => {
    if (!isPathSafe(projectPath)) {
      logSecurityEvent('path-traversal', 'high', 'Visual editor undo blocked for unsafe path', { projectPath });
      return { error: 'Access denied: project path is outside the home directory' };
    }

    log('info', 'visual-editor', `Undoing last change for ${projectPath}`);
    const git = simpleGit({ baseDir: projectPath, timeout: { block: 10000 } });
    await git.stash(['pop']);
    return { success: true };
  });

  // Redo: rebuild prompt from action and re-execute
  ipcMain.handle(IPC_CHANNELS.VISUAL_EDITOR_REDO, async (_, projectPath: string, action: VisualAction) => {
    if (!isPathSafe(projectPath)) {
      logSecurityEvent('path-traversal', 'high', 'Visual editor redo blocked for unsafe path', { projectPath });
      return { error: 'Access denied: project path is outside the home directory' };
    }

    log('info', 'visual-editor', `Redo action ${action.id} for ${projectPath}`);
    const prompt = buildVisualEditPrompt(action);

    return new Promise((resolve) => {
      const proc = pty.spawn('claude', ['--print', prompt], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: projectPath,
        env: {
          ...cleanEnv(),
          TERM: 'xterm-256color',
        },
      });

      const redoId = `redo-${action.id}`;
      activeProcesses.set(redoId, proc);

      proc.onExit(({ exitCode }: { exitCode: number }) => {
        activeProcesses.delete(redoId);
        if (exitCode !== 0) {
          log('warn', 'visual-editor', `Redo exited with code ${exitCode}`);
          resolve({ success: false, error: `Claude exited with code ${exitCode}` });
        } else {
          log('info', 'visual-editor', `Redo ${action.id} completed`);
          resolve({ success: true });
        }
      });
    });
  });

  // Execute a visual edit: checkpoint + build prompt + run claude --print
  ipcMain.handle(IPC_CHANNELS.VISUAL_EDITOR_EXECUTE, async (_, opts: {
    projectPath: string;
    action: VisualAction;
    checkpointId: string;
  }) => {
    if (!isPathSafe(opts.projectPath)) {
      logSecurityEvent('path-traversal', 'high', 'Visual editor execute blocked for unsafe path', { projectPath: opts.projectPath });
      return { error: 'Access denied: project path is outside the home directory' };
    }

    const { projectPath, action, checkpointId } = opts;
    log('info', 'visual-editor', `Executing visual edit ${action.id} (checkpoint: ${checkpointId})`);

    // 1. Create checkpoint
    try {
      const git = simpleGit({ baseDir: projectPath, timeout: { block: 10000 } });
      await git.stash(['push', '-m', `forma-checkpoint-${checkpointId}`, '--include-untracked']);
    } catch (err) {
      log('warn', 'visual-editor', 'Checkpoint stash failed (may have no changes)', err);
    }

    // 2. Build enriched prompt
    const prompt = buildVisualEditPrompt(action);

    // 3. Spawn claude --print
    return new Promise((resolve) => {
      const proc = pty.spawn('claude', ['--print', prompt], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: projectPath,
        env: {
          ...cleanEnv(),
          TERM: 'xterm-256color',
        },
      });

      activeProcesses.set(action.id, proc);

      proc.onData((data: string) => {
        const lines = data.split('\n').filter(Boolean);
        for (const line of lines) {
          const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
          if (clean.length > 0) {
            pushUpdate(IPC_CHANNELS.REQUEST_FEED_UPDATE, {
              timestamp: Date.now(),
              type: 'action',
              message: clean,
              detail: clean,
              requestId: action.id,
            });
          }
        }
      });

      proc.onExit(({ exitCode }: { exitCode: number }) => {
        activeProcesses.delete(action.id);
        if (exitCode !== 0) {
          log('warn', 'visual-editor', `Execute exited with code ${exitCode}`);
          pushUpdate(IPC_CHANNELS.REQUEST_FEED_UPDATE, {
            timestamp: Date.now(),
            type: 'error',
            message: `Visual edit failed: Claude exited with code ${exitCode}`,
            requestId: action.id,
          });
          resolve({ success: false, error: `Claude exited with code ${exitCode}`, checkpointId });
        } else {
          log('info', 'visual-editor', `Execute ${action.id} completed`);
          pushUpdate(IPC_CHANNELS.REQUEST_FEED_UPDATE, {
            timestamp: Date.now(),
            type: 'complete',
            message: 'Visual edit applied',
            requestId: action.id,
          });
          resolve({ success: true, checkpointId });
        }
      });
    });
  });
}

export function cleanupVisualEditor() {
  for (const [id, proc] of activeProcesses) {
    proc.kill();
    activeProcesses.delete(id);
  }
}
