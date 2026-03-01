import { ipcMain } from 'electron';
import { readFileSync, writeFileSync, realpathSync, openSync, closeSync, constants } from 'fs';
import path from 'path';
import os from 'os';
import { IPC_CHANNELS } from '../../shared/types';
import { logSecurityEvent } from '../helpers/security-logger';

const HOME = os.homedir();
const REAL_HOME = realpathSync(HOME);

function expandTilde(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(HOME, filePath.slice(1));
  }
  return filePath;
}

function isPathSafe(filePath: string): boolean {
  const resolved = path.resolve(expandTilde(filePath));
  try {
    const real = realpathSync(resolved);
    if (!real.startsWith(REAL_HOME)) {
      logSecurityEvent('path-traversal', 'high', 'File access blocked: resolved path outside home', { filePath, resolved: real });
      return false;
    }
    return true;
  } catch {
    // File doesn't exist yet (e.g. write to new file) -- fall back to string check
    if (!resolved.startsWith(REAL_HOME)) {
      logSecurityEvent('path-traversal', 'high', 'File access blocked: path outside home', { filePath, resolved });
      return false;
    }
    return true;
  }
}

export function registerFileHandlers() {
  ipcMain.handle(IPC_CHANNELS.READ_FILE, async (_, filePath: string) => {
    if (!isPathSafe(filePath)) {
      throw new Error('Access denied: path is outside the home directory');
    }

    const resolved = path.resolve(expandTilde(filePath));

    try {
      // Re-resolve realpath immediately before read to minimize TOCTOU gap
      const realResolved = realpathSync(resolved);
      if (!realResolved.startsWith(REAL_HOME)) {
        throw new Error('Access denied: path is outside the home directory');
      }

      // Use O_NOFOLLOW to avoid following symlinks at the final component
      const fd = openSync(realResolved, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        return readFileSync(fd, 'utf-8');
      } finally {
        closeSync(fd);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Access denied')) throw err;
      if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw new Error(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.WRITE_FILE, async (_, filePath: string, content: string) => {
    if (!isPathSafe(filePath)) {
      throw new Error('Access denied: path is outside the home directory');
    }

    const resolved = path.resolve(expandTilde(filePath));

    try {
      // Re-resolve realpath immediately before write to minimize TOCTOU gap
      // For new files, realpath may fail — that's acceptable
      try {
        const realResolved = realpathSync(resolved);
        if (!realResolved.startsWith(REAL_HOME)) {
          throw new Error('Access denied: path is outside the home directory');
        }
        writeFileSync(realResolved, content, 'utf-8');
      } catch (err) {
        if (err instanceof Error && err.message.includes('Access denied')) throw err;
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          // New file — resolved path was already validated as within home
          writeFileSync(resolved, content, 'utf-8');
        } else {
          throw err;
        }
      }
      return true;
    } catch (err) {
      if (err instanceof Error && err.message.includes('Access denied')) throw err;
      throw new Error(`Failed to write file: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}
