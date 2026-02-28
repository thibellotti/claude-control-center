import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';

// node-pty must be required (not imported) because it's a native module
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty = require('node-pty');

interface PtySession {
  id: string;
  process: ReturnType<typeof pty.spawn>;
  cwd: string;
  createdAt: number;
}

const sessions = new Map<string, PtySession>();
let nextId = 1;

/** Return a copy of process.env without Claude Code session vars */
function cleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_SESSION;
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
    };

    sessions.set(id, session);

    // Stream pty output to renderer
    proc.onData((data: string) => {
      sendToRenderer(IPC_CHANNELS.PTY_DATA, { id, data });
    });

    proc.onExit(({ exitCode, signal }: { exitCode: number; signal: number }) => {
      sendToRenderer(IPC_CHANNELS.PTY_EXIT, { id, exitCode, signal });
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
}
