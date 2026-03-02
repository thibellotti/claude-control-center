import { ipcMain, shell } from 'electron';
import { execFile } from 'child_process';
import { IPC_CHANNELS } from '../../shared/types';
import { log } from '../helpers/logger';
import { logSecurityEvent } from '../helpers/security-logger';
import { isPathSafe } from '../helpers/path-safety';

export function registerLaunchHandlers() {
  ipcMain.handle(IPC_CHANNELS.OPEN_IN_TERMINAL, async (_, projectPath: string) => {
    if (!isPathSafe(projectPath)) {
      logSecurityEvent('path-traversal', 'high', 'Open in Terminal blocked for unsafe path', { projectPath });
      throw new Error('Access denied: path is outside the home directory');
    }
    try {
      execFile('open', ['-a', 'Terminal', projectPath]);
    } catch (error: unknown) {
      log('warn', 'launch', 'Failed to open Terminal', error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_IN_EDITOR, async (_, projectPath: string) => {
    if (!isPathSafe(projectPath)) {
      logSecurityEvent('path-traversal', 'high', 'Open in Editor blocked for unsafe path', { projectPath });
      throw new Error('Access denied: path is outside the home directory');
    }
    execFile('code', [projectPath], (err) => {
      if (err) {
        shell.openPath(projectPath);
      }
    });
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_IN_FINDER, async (_, projectPath: string) => {
    if (!isPathSafe(projectPath)) {
      logSecurityEvent('path-traversal', 'high', 'Open in Finder blocked for unsafe path', { projectPath });
      throw new Error('Access denied: path is outside the home directory');
    }
    shell.showItemInFolder(projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.LAUNCH_CLAUDE, async (_, projectPath: string) => {
    if (!isPathSafe(projectPath)) {
      logSecurityEvent('path-traversal', 'high', 'Launch Claude blocked for unsafe path', { projectPath });
      throw new Error('Access denied: path is outside the home directory');
    }
    // Pass projectPath as an osascript argument to avoid AppleScript injection.
    // argv in osascript's `on run argv` is a list; item 1 is our path.
    const script = [
      'on run argv',
      '  set projectPath to item 1 of argv',
      '  tell application "Terminal"',
      '    activate',
      '    do script "cd " & quoted form of projectPath & " && claude"',
      '  end tell',
      'end run',
    ].join('\n');
    execFile('osascript', ['-e', script, projectPath], (err) => {
      if (err) {
        log('warn', 'launch', 'Failed to launch Claude via AppleScript', err);
      }
    });
  });
}
