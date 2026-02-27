import { ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import {
  IPC_CHANNELS,
  PreviewStatus,
  EnhancedPreviewState,
} from '../../shared/types';

// Chokidar loaded via require (CJS compat in Electron main process)
const chokidar = require('chokidar');

// Internal server entry: process, watcher, and state
interface ServerEntry {
  process: ChildProcess;
  watcher: ReturnType<typeof chokidar.watch> | null;
  state: EnhancedPreviewState;
}

// Track running servers per project path
const runningServers = new Map<string, ServerEntry>();

// Track standalone watchers (started without a dev server)
const standaloneWatchers = new Map<
  string,
  ReturnType<typeof chokidar.watch>
>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Push an EnhancedPreviewState update to the renderer via the first
 * BrowserWindow. Safe to call even when no window is open.
 */
function pushStatusUpdate(state: EnhancedPreviewState): void {
  try {
    const { BrowserWindow } = require('electron');
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      wins[0].webContents.send(IPC_CHANNELS.PREVIEW_STATUS_UPDATE, state);
    }
  } catch {
    // Window may have been destroyed — ignore
  }
}

/**
 * Push a file-changed event to the renderer.
 */
function pushFileChanged(projectPath: string, filePath: string): void {
  try {
    const { BrowserWindow } = require('electron');
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      wins[0].webContents.send(IPC_CHANNELS.PREVIEW_FILE_CHANGED, {
        projectPath,
        filePath,
      });
    }
  } catch {
    // ignore
  }
}

/** Build a default idle state */
function idleState(): EnhancedPreviewState {
  return {
    status: 'idle' as PreviewStatus,
    url: null,
    port: null,
    output: [],
    error: null,
    scriptName: null,
  };
}

const PORT_REGEX = /(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{4,5})/;

const IGNORED_DIRS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/.git/**',
  '**/.claude/**',
];

/**
 * Create a chokidar watcher for a project directory.
 * Emits PREVIEW_FILE_CHANGED on every add/change/unlink.
 */
function createWatcher(projectPath: string): ReturnType<typeof chokidar.watch> {
  const watcher = chokidar.watch(projectPath, {
    ignored: IGNORED_DIRS,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  const notify = (fp: string) => pushFileChanged(projectPath, fp);

  watcher.on('add', notify);
  watcher.on('change', notify);
  watcher.on('unlink', notify);

  return watcher;
}

// ---------------------------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------------------------

export function registerPreviewHandlers() {
  // ---- START_DEV_SERVER ----
  ipcMain.handle(
    IPC_CHANNELS.START_DEV_SERVER,
    async (_, projectPath: string): Promise<EnhancedPreviewState> => {
      // If already running, return existing state
      if (runningServers.has(projectPath)) {
        const entry = runningServers.get(projectPath)!;
        return { ...entry.state };
      }

      // --- Status: detecting ---
      const detectingState: EnhancedPreviewState = {
        ...idleState(),
        status: 'detecting',
      };
      pushStatusUpdate(detectingState);

      // Read package.json
      const pkgPath = path.join(projectPath, 'package.json');
      if (!existsSync(pkgPath)) {
        const errState: EnhancedPreviewState = {
          ...idleState(),
          status: 'error',
          error: 'No package.json found',
        };
        pushStatusUpdate(errState);
        return errState;
      }

      let pkg: { scripts?: Record<string, string> };
      try {
        pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      } catch {
        const errState: EnhancedPreviewState = {
          ...idleState(),
          status: 'error',
          error: 'Failed to parse package.json',
        };
        pushStatusUpdate(errState);
        return errState;
      }

      const scripts = pkg.scripts || {};

      // Determine which script to run (priority: dev > start > serve)
      let scriptName = '';
      if (scripts.dev) scriptName = 'dev';
      else if (scripts.start) scriptName = 'start';
      else if (scripts.serve) scriptName = 'serve';
      else {
        const errState: EnhancedPreviewState = {
          ...idleState(),
          status: 'error',
          error: 'No dev/start/serve script found in package.json',
        };
        pushStatusUpdate(errState);
        return errState;
      }

      // --- Status: starting ---
      const startingState: EnhancedPreviewState = {
        ...idleState(),
        status: 'starting',
        scriptName,
      };
      pushStatusUpdate(startingState);

      const output: string[] = [];
      let detectedPort: number | null = null;

      // Spawn the process
      const command = `npm run ${scriptName}`;
      const child = spawn('sh', ['-c', command], {
        cwd: projectPath,
        env: { ...process.env, BROWSER: 'none', PORT: '0' },
      });

      // Start file watcher for the project
      // Close any existing standalone watcher first
      if (standaloneWatchers.has(projectPath)) {
        standaloneWatchers.get(projectPath)!.close();
        standaloneWatchers.delete(projectPath);
      }
      const watcher = createWatcher(projectPath);

      // Build state reference (mutated in place for convenience)
      const state: EnhancedPreviewState = {
        status: 'starting',
        url: null,
        port: null,
        output,
        error: null,
        scriptName,
      };

      const entry: ServerEntry = { process: child, watcher, state };
      runningServers.set(projectPath, entry);

      // --- stdout ---
      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        output.push(text);
        if (output.length > 200) output.shift();

        if (!detectedPort) {
          const match = text.match(PORT_REGEX);
          if (match) {
            detectedPort = parseInt(match[1], 10);
            state.port = detectedPort;
            state.url = `http://localhost:${detectedPort}`;
            state.status = 'ready';
            pushStatusUpdate({ ...state, output: output.slice(-50) });
          }
        } else {
          // Already ready, still push output updates
          pushStatusUpdate({ ...state, output: output.slice(-50) });
        }
      });

      // --- stderr ---
      child.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        output.push(text);
        if (output.length > 200) output.shift();

        if (!detectedPort) {
          const match = text.match(PORT_REGEX);
          if (match) {
            detectedPort = parseInt(match[1], 10);
            state.port = detectedPort;
            state.url = `http://localhost:${detectedPort}`;
            state.status = 'ready';
            pushStatusUpdate({ ...state, output: output.slice(-50) });
          }
        } else {
          pushStatusUpdate({ ...state, output: output.slice(-50) });
        }
      });

      // --- process exit ---
      child.on('close', (code: number | null) => {
        const existing = runningServers.get(projectPath);
        if (existing) {
          // Close the watcher tied to this server
          if (existing.watcher) {
            existing.watcher.close();
          }
          runningServers.delete(projectPath);
        }

        const exitState: EnhancedPreviewState = {
          ...idleState(),
          status: code && code !== 0 ? 'error' : 'idle',
          error: code && code !== 0 ? `Process exited with code ${code}` : null,
          output: output.slice(-50),
          scriptName,
        };
        pushStatusUpdate(exitState);
      });

      child.on('error', (err: Error) => {
        const errState: EnhancedPreviewState = {
          ...idleState(),
          status: 'error',
          error: err.message,
          output: output.slice(-50),
          scriptName,
        };
        state.status = 'error';
        state.error = err.message;
        pushStatusUpdate(errState);
      });

      // Wait up to 15 seconds for port detection
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (detectedPort) {
            clearInterval(interval);
            resolve();
          }
        }, 500);
        setTimeout(() => {
          clearInterval(interval);
          resolve();
        }, 15000);
      });

      // Build final response snapshot
      const finalState: EnhancedPreviewState = {
        status: detectedPort ? 'ready' : state.status === 'error' ? 'error' : 'starting',
        url: detectedPort ? `http://localhost:${detectedPort}` : null,
        port: detectedPort,
        output: output.slice(-50),
        error: detectedPort
          ? null
          : state.error || 'Could not detect port. Server may still be starting.',
        scriptName,
      };

      // Sync state reference
      Object.assign(state, finalState);
      pushStatusUpdate(finalState);

      return finalState;
    }
  );

  // ---- STOP_DEV_SERVER ----
  ipcMain.handle(
    IPC_CHANNELS.STOP_DEV_SERVER,
    async (_, projectPath: string): Promise<boolean> => {
      const entry = runningServers.get(projectPath);
      if (entry) {
        entry.process.kill('SIGTERM');
        if (entry.watcher) {
          entry.watcher.close();
        }
        runningServers.delete(projectPath);
      }

      const stoppedState = idleState();
      pushStatusUpdate(stoppedState);

      return true;
    }
  );

  // ---- GET_DEV_SERVER_STATUS ----
  ipcMain.handle(
    IPC_CHANNELS.GET_DEV_SERVER_STATUS,
    async (_, projectPath: string): Promise<EnhancedPreviewState> => {
      const entry = runningServers.get(projectPath);
      if (!entry) {
        return idleState();
      }
      return { ...entry.state, output: entry.state.output.slice(-50) };
    }
  );

  // ---- PREVIEW_START_WATCHING ----
  ipcMain.handle(
    IPC_CHANNELS.PREVIEW_START_WATCHING,
    async (_, projectPath: string): Promise<boolean> => {
      // If a server is already running with its own watcher, skip
      if (runningServers.has(projectPath)) {
        return true;
      }

      // Close existing standalone watcher if any
      if (standaloneWatchers.has(projectPath)) {
        standaloneWatchers.get(projectPath)!.close();
        standaloneWatchers.delete(projectPath);
      }

      const watcher = createWatcher(projectPath);
      standaloneWatchers.set(projectPath, watcher);
      return true;
    }
  );

  // ---- PREVIEW_STOP_WATCHING ----
  ipcMain.handle(
    IPC_CHANNELS.PREVIEW_STOP_WATCHING,
    async (_, projectPath: string): Promise<boolean> => {
      if (standaloneWatchers.has(projectPath)) {
        standaloneWatchers.get(projectPath)!.close();
        standaloneWatchers.delete(projectPath);
      }
      return true;
    }
  );
}

// ---------------------------------------------------------------------------
// Cleanup — called on app quit
// ---------------------------------------------------------------------------

export function cleanupPreviewServers() {
  // Kill all running dev servers and close their watchers
  runningServers.forEach((entry) => {
    entry.process.kill('SIGTERM');
    if (entry.watcher) {
      entry.watcher.close();
    }
  });
  runningServers.clear();

  // Close all standalone watchers
  standaloneWatchers.forEach((watcher) => {
    watcher.close();
  });
  standaloneWatchers.clear();
}
