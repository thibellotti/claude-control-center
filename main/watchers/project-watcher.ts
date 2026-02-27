import { BrowserWindow } from 'electron';
import chokidar from 'chokidar';
import { join } from 'path';
import { homedir } from 'os';

const CLAUDE_DIR = join(homedir(), '.claude');

/**
 * Watches ~/.claude/ filesystem for changes and pushes
 * refresh signals to the renderer process via IPC.
 */
export function startProjectWatcher(mainWindow: BrowserWindow) {
  const watcher = chokidar.watch(
    [
      join(CLAUDE_DIR, 'tasks'),
      join(CLAUDE_DIR, 'teams'),
      join(CLAUDE_DIR, 'plans'),
      join(CLAUDE_DIR, 'settings.json'),
    ],
    {
      ignoreInitial: true,
      depth: 3,
      persistent: true,
    }
  );

  let timeout: NodeJS.Timeout | null = null;

  // Debounce rapid filesystem events into a single refresh signal
  watcher.on('all', () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      try {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('project-updated', { refresh: true });
        }
      } catch {
        // Window may have been destroyed between check and send
      }
    }, 500);
  });

  watcher.on('error', (err) => {
    console.error('File watcher error:', err);
  });

  return watcher;
}
