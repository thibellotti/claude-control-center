import { realpathSync } from 'fs';
import path from 'path';
import os from 'os';
import { logSecurityEvent } from './security-logger';

const HOME = os.homedir();
let REAL_HOME: string;
try {
  REAL_HOME = realpathSync(HOME);
} catch {
  REAL_HOME = HOME;
}

export { HOME, REAL_HOME };

export function expandTilde(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(HOME, filePath.slice(1));
  }
  return filePath;
}

/**
 * Check if a path is safe (within the user's home directory).
 * Resolves symlinks when possible to prevent traversal via symlink.
 */
export function isPathSafe(targetPath: string): boolean {
  const resolved = path.resolve(expandTilde(targetPath));
  try {
    const real = realpathSync(resolved);
    if (!real.startsWith(REAL_HOME)) {
      logSecurityEvent('path-traversal', 'high', 'Access blocked: path outside home', { targetPath, resolved: real });
      return false;
    }
    return true;
  } catch {
    if (!resolved.startsWith(REAL_HOME)) {
      logSecurityEvent('path-traversal', 'high', 'Access blocked: path outside home', { targetPath, resolved });
      return false;
    }
    return true;
  }
}

/**
 * Sanitize a user-provided ID to prevent path traversal.
 * Strips path separators and parent directory references.
 */
export function sanitizeId(id: string): string {
  return path.basename(id).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
}

/**
 * Validate that a filename has no path components (no traversal).
 */
export function isSafeFileName(fileName: string): boolean {
  return path.basename(fileName) === fileName && !fileName.includes('..');
}

/**
 * Check if a URL is a safe localhost URL.
 */
export function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
  } catch {
    return false;
  }
}
