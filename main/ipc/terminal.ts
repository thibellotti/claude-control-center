import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';
import type { ProviderId } from '../../shared/provider-types';
import { isPathSafe } from '../helpers/path-safety';
import { saveSessionOutput } from './session-history';
import { basename } from 'path';

// Lazy import to avoid circular dependency at module load time
let _getProvider: typeof import('./providers').getProvider | null = null;
function getProviderLazy() {
  if (!_getProvider) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _getProvider = require('./providers').getProvider;
  }
  return _getProvider!;
}

// node-pty must be required (not imported) because it's a native module
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty = require('node-pty');

interface PtySession {
  id: string;
  process: ReturnType<typeof pty.spawn>;
  cwd: string;
  createdAt: number;
  command?: string;
}

const sessions = new Map<string, PtySession>();
const sessionOutputBuffers = new Map<string, string[]>();
let nextId = 1;

// Prefixes that are always stripped regardless of provider
const ALWAYS_STRIP_PREFIXES = ['AWS_ACCESS_KEY', 'AWS_SECRET_ACCESS', 'STRIPE_'];
const ALWAYS_STRIP_KEYS = ['CLAUDECODE', 'CLAUDE_CODE_SESSION', 'GITHUB_TOKEN', 'SUPABASE_SERVICE_ROLE', 'NETLIFY_AUTH_TOKEN', 'VERCEL_TOKEN'];

// All known provider env prefixes
const ALL_PROVIDER_PREFIXES = ['ANTHROPIC_', 'OPENAI_', 'GOOGLE_', 'GEMINI_'];

/**
 * Return a copy of process.env without sensitive or session vars.
 * If providerId is given, keep that provider's required env prefixes
 * and strip only the other providers' prefixes.
 */
export function cleanEnv(providerId?: ProviderId): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const deleteIfPrefix = (prefix: string) => {
    for (const key of Object.keys(env)) {
      if (key.startsWith(prefix)) delete env[key];
    }
  };

  // Always strip session and generic sensitive vars
  for (const key of ALWAYS_STRIP_KEYS) {
    delete env[key];
  }
  for (const prefix of ALWAYS_STRIP_PREFIXES) {
    deleteIfPrefix(prefix);
  }

  // Determine which provider prefixes to keep
  let keepPrefixes: string[] = [];
  if (providerId) {
    try {
      const provider = getProviderLazy()(providerId);
      keepPrefixes = provider.requiredEnvPrefixes;
    } catch {
      // Provider not found — strip everything
    }
  }

  // Strip provider env prefixes not needed by the active provider
  for (const prefix of ALL_PROVIDER_PREFIXES) {
    if (!keepPrefixes.includes(prefix)) {
      deleteIfPrefix(prefix);
    }
  }

  return env;
}

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

function sendToRenderer(channel: string, ...args: unknown[]) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, ...args);
  }
}

export function registerTerminalHandlers() {
  // Create a new PTY session
  ipcMain.handle(IPC_CHANNELS.PTY_CREATE, async (_event, opts: { cwd?: string; command?: string }) => {
    const id = `pty-${nextId++}`;
    const shell = process.env.SHELL || '/bin/zsh';
    const cwd = opts?.cwd || process.env.HOME || '/';

    // Validate the requested working directory before spawning
    if (opts?.cwd && !isPathSafe(opts.cwd)) {
      return { error: 'Access denied: cwd is outside the home directory' };
    }

    const proc = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd,
      env: {
        ...cleanEnv(),
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      },
    });

    const session: PtySession = {
      id,
      process: proc,
      cwd,
      createdAt: Date.now(),
      command: opts?.command,
    };

    sessions.set(id, session);
    sessionOutputBuffers.set(id, []);

    // Stream pty output to renderer
    proc.onData((data: string) => {
      sendToRenderer(IPC_CHANNELS.PTY_DATA, { id, data });
      // Buffer output for session history
      const buf = sessionOutputBuffers.get(id);
      if (buf) buf.push(data);
    });

    proc.onExit(({ exitCode, signal }: { exitCode: number; signal: number }) => {
      sendToRenderer(IPC_CHANNELS.PTY_EXIT, { id, exitCode, signal });

      // Save accumulated output to session history
      const buf = sessionOutputBuffers.get(id);
      if (buf && buf.length > 0) {
        saveSessionOutput({
          sessionId: id,
          projectPath: cwd,
          projectName: basename(cwd),
          command: opts?.command,
          output: buf.join(''),
        });
      }
      sessionOutputBuffers.delete(id);
      sessions.delete(id);
    });

    // If a command was provided, write it to the shell after a short delay
    if (opts?.command) {
      const sessionId = id;
      const cmd = opts.command;
      setTimeout(() => {
        const s = sessions.get(sessionId);
        if (s) {
          s.process.write(cmd + '\n');
        }
      }, 100);
    }

    return { id, cwd, pid: proc.pid };
  });

  // Write input to a PTY
  ipcMain.handle(IPC_CHANNELS.PTY_WRITE, async (_event, opts: { id: string; data: string }) => {
    const session = sessions.get(opts.id);
    if (session) {
      session.process.write(opts.data);
      return true;
    }
    return false;
  });

  // Resize a PTY
  ipcMain.handle(IPC_CHANNELS.PTY_RESIZE, async (_event, opts: { id: string; cols: number; rows: number }) => {
    const session = sessions.get(opts.id);
    if (session) {
      session.process.resize(opts.cols, opts.rows);
      return true;
    }
    return false;
  });

  // Kill a PTY
  ipcMain.handle(IPC_CHANNELS.PTY_KILL, async (_event, opts: { id: string }) => {
    const session = sessions.get(opts.id);
    if (session) {
      // Save output before killing
      const buf = sessionOutputBuffers.get(opts.id);
      if (buf && buf.length > 0) {
        saveSessionOutput({
          sessionId: opts.id,
          projectPath: session.cwd,
          projectName: basename(session.cwd),
          command: session.command,
          output: buf.join(''),
        });
      }
      sessionOutputBuffers.delete(opts.id);
      session.process.kill();
      sessions.delete(opts.id);
      return true;
    }
    return false;
  });

  // List active PTY sessions
  ipcMain.handle(IPC_CHANNELS.PTY_LIST, async () => {
    return Array.from(sessions.values()).map((s) => ({
      id: s.id,
      cwd: s.cwd,
      pid: s.process.pid,
      createdAt: s.createdAt,
    }));
  });
}

export function cleanupTerminalSessions() {
  for (const [id, session] of sessions) {
    try {
      session.process.kill();
    } catch {
      // Already dead
    }
    sessions.delete(id);
  }
  sessionOutputBuffers.clear();
}
