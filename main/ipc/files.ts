import { ipcMain } from 'electron';
import { readFileSync, writeFileSync, existsSync, realpathSync } from 'fs';
import path from 'path';
import os from 'os';
import { IPC_CHANNELS } from '../../shared/types';

const HOME = os.homedir();
const REAL_HOME = realpathSync(HOME);

// Validate that a file path is within the user's home directory
// to prevent arbitrary filesystem access.
function expandTilde(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(HOME, filePath.slice(1));
  }
  return filePath;
}

function isPathSafe(filePath: string): boolean {
  const resolved = path.resolve(expandTilde(filePath));
  // Canonicalize through symlinks to prevent symlink-based traversal
  try {
    const real = realpathSync(resolved);
    return real.startsWith(REAL_HOME);
  } catch {
    // File doesn't exist yet (e.g. write to new file) — fall back to string check
    return resolved.startsWith(REAL_HOME);
  }
}

export function registerFileHandlers() {
  ipcMain.handle(IPC_CHANNELS.READ_FILE, async (_, filePath: string) => {
    if (!isPathSafe(filePath)) {
      throw new Error('Access denied: path is outside the home directory');
    }

    const resolved = path.resolve(expandTilde(filePath));

    if (!existsSync(resolved)) {
      return null;
    }

    try {
      return readFileSync(resolved, 'utf-8');
    } catch (err) {
      throw new Error(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.WRITE_FILE, async (_, filePath: string, content: string) => {
    if (!isPathSafe(filePath)) {
      throw new Error('Access denied: path is outside the home directory');
    }

    const resolved = path.resolve(expandTilde(filePath));

    try {
      writeFileSync(resolved, content, 'utf-8');
      return true;
    } catch (err) {
      throw new Error(`Failed to write file: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}
