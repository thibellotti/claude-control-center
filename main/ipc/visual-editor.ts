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

  // Inject overlay directly into the iframe's WebFrame using Electron's WebFrameMain API.
  // This bypasses the cross-origin restriction that blocks contentDocument access from
  // the renderer (parent origin differs from the iframe's localhost dev server origin).
  ipcMain.handle(IPC_CHANNELS.VISUAL_EDITOR_INJECT_FRAME, async (_, frameUrl: string) => {
    if (!overlayScript) {
      try {
        const op = path.join(__dirname, '..', 'scripts', 'overlay.js');
        overlayScript = await fs.readFile(op, 'utf-8');
      } catch (err) {
        log('error', 'visual-editor', 'Failed to read overlay script for frame injection', err);
        return { error: 'Overlay script not found' };
      }
    }

    const win = getMainWindow();
    if (!win) return { error: 'No main window' };

    // Walk all subframes of the main frame to find one whose URL matches the preview iframe.
    // WebFrameMain.frames only returns direct children; we use a BFS to find nested frames too.
    function findFrame(root: Electron.WebFrameMain, targetUrl: string): Electron.WebFrameMain | null {
      const queue: Electron.WebFrameMain[] = [root];
      while (queue.length > 0) {
        const frame = queue.shift()!;
        // Match by origin (scheme+host+port) so we don't need an exact path match.
        try {
          const frameOrigin = new URL(frame.url).origin;
          const targetOrigin = new URL(targetUrl).origin;
          if (frameOrigin === targetOrigin) return frame;
        } catch {
          // Ignore frames with unparseable URLs (e.g., about:blank)
        }
        for (const child of frame.frames) {
          queue.push(child);
        }
      }
      return null;
    }

    const targetFrame = findFrame(win.webContents.mainFrame, frameUrl);
    if (!targetFrame) {
      log('warn', 'visual-editor', `Could not find iframe frame for URL: ${frameUrl}`);
      return { error: `No frame found matching origin of: ${frameUrl}` };
    }

    try {
      await targetFrame.executeJavaScript(overlayScript);
      log('info', 'visual-editor', `Overlay injected via WebFrameMain for: ${frameUrl}`);
      return { success: true };
    } catch (err) {
      log('error', 'visual-editor', 'WebFrameMain executeJavaScript failed', err);
      return { error: (err as Error).message || 'Frame injection failed' };
    }
  });

  // Remove overlay from preview iframe
  ipcMain.handle(IPC_CHANNELS.VISUAL_EDITOR_REMOVE, async () => {
    log('info', 'visual-editor', 'Removing overlay');
    return { cleanup: 'window.__formaOverlayCleanup && window.__formaOverlayCleanup()' };
  });

  // Create a git commit checkpoint (saves current state as a named savepoint)
  ipcMain.handle(IPC_CHANNELS.VISUAL_EDITOR_CHECKPOINT, async (_, projectPath: string, checkpointId: string) => {
    if (!isPathSafe(projectPath)) {
      logSecurityEvent('path-traversal', 'high', 'Visual editor checkpoint blocked for unsafe path', { projectPath });
      return { error: 'Access denied: project path is outside the home directory' };
    }

    log('info', 'visual-editor', `Creating checkpoint ${checkpointId} for ${projectPath}`);
    const git = simpleGit({ baseDir: projectPath, timeout: { block: 10000 } });
    await git.add('-A');
    const result = await git.commit(`forma-checkpoint-${checkpointId}`, { '--allow-empty': null });
    return { commitRef: result.commit, checkpointId };
  });

  // Undo: discard all uncommitted changes back to the last checkpoint commit
  ipcMain.handle(IPC_CHANNELS.VISUAL_EDITOR_UNDO, async (_, projectPath: string) => {
    if (!isPathSafe(projectPath)) {
      logSecurityEvent('path-traversal', 'high', 'Visual editor undo blocked for unsafe path', { projectPath });
      return { error: 'Access denied: project path is outside the home directory' };
    }

    log('info', 'visual-editor', `Undoing last change for ${projectPath}`);
    const git = simpleGit({ baseDir: projectPath, timeout: { block: 10000 } });
    try {
      // Restore tracked files to HEAD (the checkpoint commit)
      await git.checkout(['--', '.']);
      // Remove any untracked files/dirs added by Claude
      await git.clean('f', ['-d']);
      return { success: true };
    } catch (err) {
      log('error', 'visual-editor', 'Undo failed', err);
      return { success: false, error: (err as Error).message || 'Undo failed' };
    }
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
      const proc = pty.spawn('claude', ['-p', prompt, '--allowedTools', 'Edit,Write,Read'], {
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

  // Execute a visual edit: checkpoint commit + build prompt + run claude -p with tool use
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

    // 1. Commit current state as checkpoint savepoint so undo can revert to it
    try {
      const git = simpleGit({ baseDir: projectPath, timeout: { block: 10000 } });
      await git.add('-A');
      await git.commit(`forma-checkpoint-${checkpointId}`, { '--allow-empty': null });
    } catch (err) {
      log('warn', 'visual-editor', 'Checkpoint commit failed', err);
    }

    // 2. Build enriched prompt
    const prompt = buildVisualEditPrompt(action);

    // 3. Spawn claude -p so it applies file changes via tool use (not --print which only prints)
    return new Promise((resolve) => {
      const proc = pty.spawn('claude', ['-p', prompt, '--allowedTools', 'Edit,Write,Read'], {
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
