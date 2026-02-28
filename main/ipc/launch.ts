import { ipcMain, shell } from 'electron';
import { execFile } from 'child_process';
import { IPC_CHANNELS } from '../../shared/types';
import { log } from '../helpers/logger';

export function registerLaunchHandlers() {
  ipcMain.handle(IPC_CHANNELS.OPEN_IN_TERMINAL, async (_, projectPath: string) => {
    try {
      execFile('open', ['-a', 'Terminal', projectPath]);
    } catch (error: unknown) {
      log('warn', 'launch', 'Failed to open Terminal', error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_IN_EDITOR, async (_, projectPath: string) => {
    execFile('code', [projectPath], (err) => {
      if (err) {
        shell.openPath(projectPath);
      }
    });
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_IN_FINDER, async (_, projectPath: string) => {
    shell.showItemInFolder(projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.LAUNCH_CLAUDE, async (_, projectPath: string) => {
    // Use execFile with -e flag to pass AppleScript safely — no shell interpolation
    const script = [
      'tell application "Terminal"',
      '  activate',
      `  do script "cd " & quoted form of "${projectPath}" & " && claude"`,
      'end tell',
    ].join('\n');
    execFile('osascript', ['-e', script], (err) => {
      if (err) {
        log('warn', 'launch', 'Failed to launch Claude via AppleScript', err);
      }
    });
  });
}
