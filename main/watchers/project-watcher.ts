import { BrowserWindow } from 'electron';
import chokidar from 'chokidar';
import { join, relative } from 'path';
import { homedir } from 'os';

const CLAUDE_DIR = join(homedir(), '.claude');

/**
 * Extracts a project hint from a changed file path.
 * - tasks/<name>/... → returns <name>
 * - teams/<name>/... → returns <name>
 * - plans/...        → returns null (global change)
 * - settings.json    → returns '__settings__'
 */
function extractProjectHint(filePath: string): string | null {
  const rel = relative(CLAUDE_DIR, filePath);
  const parts = rel.split('/');

  if (parts[0] === 'tasks' && parts[1]) {
    return parts[1];
  }

  if (parts[0] === 'teams' && parts[1]) {
    return parts[1];
  }

  if (parts[0] === 'plans') {
    return null;
  }

  if (rel === 'settings.json') {
    return '__settings__';
  }

  // Unknown path — treat as global
  return null;
}

/**
 * Watches ~/.claude/ filesystem for changes and pushes
 * refresh signals to the renderer process via IPC.
 * Includes hints about which projects or settings changed.
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
  const pendingHints = new Set<string | null>();

  // Debounce rapid filesystem events into a single refresh signal
  watcher.on('all', (_event: string, filePath: string) => {
    const hint = extractProjectHint(filePath);
    pendingHints.add(hint);

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      try {
        if (!mainWindow.isDestroyed()) {
          // Build the hints array, replacing null (global) with '__all__'
          const hints: string[] = [];
          let hasGlobal = false;

          for (const h of pendingHints) {
            if (h === null) {
              hasGlobal = true;
            } else {
              hints.push(h);
            }
          }

          if (hasGlobal) {
            hints.push('__all__');
          }

          pendingHints.clear();

          mainWindow.webContents.send('project-updated', { refresh: true, hints });
        }
      } catch {
        // Window may have been destroyed between check and send
      }
    }, 2000); // 2s debounce to batch rapid changes during active Claude sessions
  });

  watcher.on('error', (err) => {
    console.error('File watcher error:', err);
  });

  return watcher;
}
