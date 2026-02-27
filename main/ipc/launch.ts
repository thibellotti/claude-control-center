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
}
