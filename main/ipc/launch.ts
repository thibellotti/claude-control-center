import { ipcMain, shell } from 'electron';
import { exec } from 'child_process';
import { IPC_CHANNELS } from '../../shared/types';

export function registerLaunchHandlers() {
  ipcMain.handle(IPC_CHANNELS.OPEN_IN_TERMINAL, async (_, projectPath: string) => {
    exec(`open -a Terminal "${projectPath}"`);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_IN_EDITOR, async (_, projectPath: string) => {
    exec(`code "${projectPath}"`, (err) => {
      if (err) {
        shell.openPath(projectPath);
      }
    });
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_IN_FINDER, async (_, projectPath: string) => {
    shell.showItemInFolder(projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.LAUNCH_CLAUDE, async (_, projectPath: string) => {
    // Build an AppleScript that opens Terminal and runs claude in the given directory.
    // The project path is embedded inside a double-quoted shell string, so we only
    // need to escape backslashes and double-quotes within the path itself.
    const safePath = projectPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const script = `tell application "Terminal"\n  activate\n  do script "cd \\"${safePath}\\" && claude"\nend tell`;
    exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
  });
}
