import { ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { basename } from 'path';
import { IPC_CHANNELS } from '../../shared/types';
import type { ActiveSession } from '../../shared/types';

const execAsync = promisify(exec);

async function detectActiveSessions(): Promise<ActiveSession[]> {
  try {
    // Find claude processes — [c]laude trick prevents grep from matching itself
    const { stdout } = await execAsync(
      'ps -eo pid,lstart,command | grep -E "[c]laude" | grep -v "Claude Control Center"'
    );

    const sessions: ActiveSession[] = [];
    const lines = stdout.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      // Parse PID from start of line
      const pidMatch = line.match(/^\s*(\d+)/);
      if (!pidMatch) continue;
      const pid = parseInt(pidMatch[1], 10);

      // Try to get the working directory of the process using lsof
      let projectPath = '';
      try {
        const { stdout: cwdOut } = await execAsync(
          `lsof -a -p ${pid} -d cwd -Fn 2>/dev/null | grep '^n' | head -1`
        );
        const cwdMatch = cwdOut.match(/^n(.+)$/m);
        if (cwdMatch) {
          projectPath = cwdMatch[1];
        }
      } catch {}

      if (projectPath) {
        sessions.push({
          pid,
          projectPath,
          projectName: basename(projectPath),
          startTime: Date.now(),
          command: line.trim(),
        });
      }
    }

    return sessions;
  } catch {
    // No claude processes found (grep returns exit code 1)
    return [];
  }
}

export function registerSessionHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_ACTIVE_SESSIONS, async () => {
    return detectActiveSessions();
  });
}
