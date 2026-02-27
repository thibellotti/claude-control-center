import { ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { IPC_CHANNELS, PreviewState } from '../../shared/types';

// Track running servers per project
const runningServers = new Map<
  string,
  { process: ChildProcess; port: number | null; output: string[] }
>();

export function registerPreviewHandlers() {
  ipcMain.handle(
    IPC_CHANNELS.START_DEV_SERVER,
    async (_, projectPath: string): Promise<PreviewState> => {
      // If already running, return existing state
      if (runningServers.has(projectPath)) {
        const server = runningServers.get(projectPath)!;
        return {
          url: server.port ? `http://localhost:${server.port}` : null,
          isRunning: true,
          port: server.port,
          output: server.output.slice(-50),
          error: null,
        };
      }

      // Read package.json to find dev script
      const pkgPath = path.join(projectPath, 'package.json');
      if (!existsSync(pkgPath)) {
        return {
          url: null,
          isRunning: false,
          port: null,
          output: [],
          error: 'No package.json found',
        };
      }

      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const scripts = pkg.scripts || {};

      // Determine which command to run (priority: dev, start, serve)
      let command = '';
      if (scripts.dev) command = 'npm run dev';
      else if (scripts.start) command = 'npm run start';
      else if (scripts.serve) command = 'npm run serve';
      else {
        return {
          url: null,
          isRunning: false,
          port: null,
          output: [],
          error: 'No dev/start/serve script found',
        };
      }

      const output: string[] = [];
      let detectedPort: number | null = null;

      // Spawn the process
      const child = spawn('sh', ['-c', command], {
        cwd: projectPath,
        env: { ...process.env, BROWSER: 'none', PORT: '0' },
      });

      runningServers.set(projectPath, { process: child, port: null, output });

      // Parse output for port detection
      const portRegex = /(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{4,5})/;

      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        output.push(text);
        if (output.length > 200) output.shift();

        if (!detectedPort) {
          const match = text.match(portRegex);
          if (match) {
            detectedPort = parseInt(match[1], 10);
            const server = runningServers.get(projectPath);
            if (server) server.port = detectedPort;
          }
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        output.push(text);
        if (output.length > 200) output.shift();

        if (!detectedPort) {
          const match = text.match(portRegex);
          if (match) {
            detectedPort = parseInt(match[1], 10);
            const server = runningServers.get(projectPath);
            if (server) server.port = detectedPort;
          }
        }
      });

      child.on('close', () => {
        runningServers.delete(projectPath);
      });

      // Wait up to 15 seconds for port detection
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (detectedPort) {
            clearInterval(interval);
            resolve();
          }
        }, 500);
        setTimeout(() => {
          clearInterval(interval);
          resolve();
        }, 15000);
      });

      return {
        url: detectedPort ? `http://localhost:${detectedPort}` : null,
        isRunning: true,
        port: detectedPort,
        output: output.slice(-50),
        error: detectedPort
          ? null
          : 'Could not detect port. Server may still be starting.',
      };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.STOP_DEV_SERVER,
    async (_, projectPath: string): Promise<boolean> => {
      const server = runningServers.get(projectPath);
      if (server) {
        server.process.kill('SIGTERM');
        runningServers.delete(projectPath);
      }
      return true;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_DEV_SERVER_STATUS,
    async (_, projectPath: string): Promise<PreviewState> => {
      const server = runningServers.get(projectPath);
      if (!server) {
        return {
          url: null,
          isRunning: false,
          port: null,
          output: [],
          error: null,
        };
      }
      return {
        url: server.port ? `http://localhost:${server.port}` : null,
        isRunning: true,
        port: server.port,
        output: server.output.slice(-50),
        error: null,
      };
    }
  );
}

// Cleanup on app quit
export function cleanupPreviewServers() {
  runningServers.forEach((server) => {
    server.process.kill('SIGTERM');
  });
  runningServers.clear();
}
