import { ipcMain, BrowserWindow } from 'electron';
import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import simpleGit from 'simple-git';
import { IPC_CHANNELS } from '../../shared/types';
import type { WorktreeSession } from '../../shared/worktree-types';
import { log } from '../helpers/logger';
import { isPathSafe } from '../helpers/path-safety';
import { logSecurityEvent } from '../helpers/security-logger';
import { cleanEnv } from './terminal';
import { saveSessionOutput } from './session-history';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty = require('node-pty');

const FORMA_DIR = join(homedir(), '.forma');
const WORKTREES_FILE = join(FORMA_DIR, 'worktrees.json');

// In-memory store
let sessions: WorktreeSession[] = [];

// Active PTY processes keyed by worktree session id
const activePtys = new Map<string, ReturnType<typeof import('node-pty').spawn>>();

// Output buffers for session history
const outputBuffers = new Map<string, string[]>();

async function ensureDir() {
  await fs.mkdir(FORMA_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

async function loadSessions(): Promise<WorktreeSession[]> {
  await ensureDir();
  try {
    const data = await fs.readFile(WORKTREES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveSessions(): Promise<void> {
  await ensureDir();
  await fs.writeFile(WORKTREES_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

let dataReady: Promise<void>;

export function registerWorktreeHandlers() {
  dataReady = loadSessions().then((loaded) => {
    sessions = loaded;
    log('info', 'worktrees', `Loaded ${sessions.length} worktree sessions`);
  });

  // WORKTREE_CREATE
  ipcMain.handle(
    IPC_CHANNELS.WORKTREE_CREATE,
    async (_, opts: { projectPath: string; branchName?: string }) => {
      await dataReady;

      if (!isPathSafe(opts.projectPath)) {
        logSecurityEvent('path-traversal', 'high', 'Worktree create blocked for unsafe path', {
          projectPath: opts.projectPath,
        });
        throw new Error('Access denied: project path is outside the home directory');
      }

      const git = simpleGit(opts.projectPath);
      const baseBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
      const branchName = opts.branchName || `forma-worktree-${Date.now()}`;
      const worktreePath = join(opts.projectPath, '.forma-worktrees', branchName);

      // Ensure the parent directory exists
      await fs.mkdir(join(opts.projectPath, '.forma-worktrees'), { recursive: true });

      await git.raw(['worktree', 'add', '-b', branchName, worktreePath]);

      const session: WorktreeSession = {
        id: uuidv4(),
        projectPath: opts.projectPath,
        worktreePath,
        branchName,
        baseBranch: baseBranch.trim(),
        status: 'active',
        createdAt: Date.now(),
      };

      sessions.push(session);
      await saveSessions();

      log('info', 'worktrees', `Created worktree ${branchName} at ${worktreePath}`);
      return session;
    }
  );

  // WORKTREE_LIST
  ipcMain.handle(
    IPC_CHANNELS.WORKTREE_LIST,
    async (_, opts?: { projectPath?: string }) => {
      await dataReady;
      if (opts?.projectPath) {
        return sessions.filter((s) => s.projectPath === opts.projectPath);
      }
      return sessions;
    }
  );

  // WORKTREE_DIFF
  ipcMain.handle(
    IPC_CHANNELS.WORKTREE_DIFF,
    async (_, opts: { worktreeSessionId: string }) => {
      await dataReady;

      const session = sessions.find((s) => s.id === opts.worktreeSessionId);
      if (!session) throw new Error(`Worktree session not found: ${opts.worktreeSessionId}`);

      const git = simpleGit(session.worktreePath);
      const diffText = await git.diff([session.baseBranch]);
      const diffStat = await git.diffSummary([session.baseBranch]);

      const summary = {
        filesChanged: diffStat.changed,
        insertions: diffStat.insertions,
        deletions: diffStat.deletions,
      };

      // Update session with latest diff summary
      session.diffSummary = summary;
      await saveSessions();

      return { summary, fullDiff: diffText };
    }
  );

  // WORKTREE_MERGE
  ipcMain.handle(
    IPC_CHANNELS.WORKTREE_MERGE,
    async (_, opts: { worktreeSessionId: string }) => {
      await dataReady;

      const session = sessions.find((s) => s.id === opts.worktreeSessionId);
      if (!session) throw new Error(`Worktree session not found: ${opts.worktreeSessionId}`);

      const git = simpleGit(session.projectPath);
      await git.merge([session.branchName]);

      session.status = 'merged';
      session.completedAt = Date.now();
      await saveSessions();

      // Clean up worktree
      try {
        await git.raw(['worktree', 'remove', session.worktreePath]);
      } catch (err) {
        log('warn', 'worktrees', `Failed to remove worktree directory: ${err}`);
      }

      log('info', 'worktrees', `Merged worktree ${session.branchName} into ${session.baseBranch}`);
      return session;
    }
  );

  // WORKTREE_REMOVE
  ipcMain.handle(
    IPC_CHANNELS.WORKTREE_REMOVE,
    async (_, opts: { worktreeSessionId: string }) => {
      await dataReady;

      const session = sessions.find((s) => s.id === opts.worktreeSessionId);
      if (!session) throw new Error(`Worktree session not found: ${opts.worktreeSessionId}`);

      const git = simpleGit(session.projectPath);

      // Kill active PTY if running
      const proc = activePtys.get(session.id);
      if (proc) {
        proc.kill();
        activePtys.delete(session.id);
        outputBuffers.delete(session.id);
      }

      try {
        await git.raw(['worktree', 'remove', '--force', session.worktreePath]);
      } catch (err) {
        log('warn', 'worktrees', `Failed to remove worktree: ${err}`);
      }

      try {
        await git.branch(['-D', session.branchName]);
      } catch (err) {
        log('warn', 'worktrees', `Failed to delete branch: ${err}`);
      }

      session.status = 'abandoned';
      session.completedAt = Date.now();
      await saveSessions();

      log('info', 'worktrees', `Abandoned worktree ${session.branchName}`);
      return session;
    }
  );

  // WORKTREE_SPAWN_AGENT
  ipcMain.handle(
    IPC_CHANNELS.WORKTREE_SPAWN_AGENT,
    async (_, opts: { worktreeSessionId: string; command?: string }) => {
      await dataReady;

      const session = sessions.find((s) => s.id === opts.worktreeSessionId);
      if (!session) throw new Error(`Worktree session not found: ${opts.worktreeSessionId}`);

      const shell = process.env.SHELL || '/bin/zsh';
      const ptyId = `worktree-pty-${session.id}`;

      const proc = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: session.worktreePath,
        env: {
          ...cleanEnv(),
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        },
      });

      session.ptySessionId = ptyId;
      activePtys.set(session.id, proc);
      outputBuffers.set(session.id, []);
      await saveSessions();

      // Stream output to renderer
      proc.onData((data: string) => {
        pushUpdate(IPC_CHANNELS.WORKTREE_PTY_DATA, {
          worktreeSessionId: session.id,
          data,
        });
        const buf = outputBuffers.get(session.id);
        if (buf) buf.push(data);
      });

      // On exit: update status, calculate diff
      proc.onExit(async ({ exitCode }: { exitCode: number }) => {
        activePtys.delete(session.id);

        // Save output to session history
        const buf = outputBuffers.get(session.id);
        if (buf && buf.length > 0) {
          saveSessionOutput({
            sessionId: ptyId,
            projectPath: session.worktreePath,
            projectName: basename(session.worktreePath),
            command: opts.command || 'claude',
            output: buf.join(''),
          });
        }
        outputBuffers.delete(session.id);

        // Calculate diff summary
        try {
          const git = simpleGit(session.worktreePath);
          const diffStat = await git.diffSummary([session.baseBranch]);
          session.diffSummary = {
            filesChanged: diffStat.changed,
            insertions: diffStat.insertions,
            deletions: diffStat.deletions,
          };
        } catch (err) {
          log('warn', 'worktrees', `Failed to compute diff summary on exit: ${err}`);
        }

        session.status = 'completed';
        session.completedAt = Date.now();
        await saveSessions();

        pushUpdate(IPC_CHANNELS.WORKTREE_PTY_EXIT, {
          worktreeSessionId: session.id,
          exitCode,
        });

        log('info', 'worktrees', `Worktree agent exited (${session.branchName}, exit ${exitCode})`);
      });

      // Send default command after short delay
      const command = opts.command || 'claude';
      setTimeout(() => {
        const p = activePtys.get(session.id);
        if (p) {
          p.write(command + '\n');
        }
      }, 100);

      log('info', 'worktrees', `Spawned agent in worktree ${session.branchName}`);
      return { ptyId, worktreeSessionId: session.id };
    }
  );
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export function cleanupWorktrees() {
  for (const [id, proc] of activePtys) {
    try {
      proc.kill();
    } catch {
      // Already dead
    }
    activePtys.delete(id);
  }
  outputBuffers.clear();
}
