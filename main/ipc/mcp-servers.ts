import { ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';
import { IPC_CHANNELS } from '../../shared/types';
import type { McpServerConfig, McpServerEntry } from '../../shared/types';
import { log } from '../helpers/logger';

const GLOBAL_SETTINGS_PATH = path.join(homedir(), '.claude', 'settings.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readJsonFile(filePath: string): Promise<Record<string, unknown>> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeJsonFile(filePath: string, data: Record<string, unknown>): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function parseServers(
  mcpServers: Record<string, McpServerConfig> | undefined,
  scope: 'global' | 'project',
  projectPath?: string,
): McpServerEntry[] {
  if (!mcpServers || typeof mcpServers !== 'object') return [];
  return Object.entries(mcpServers).map(([name, config]) => ({
    name,
    config,
    scope,
    projectPath,
    status: 'unknown' as const,
  }));
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerMcpServerHandlers() {
  // GET_MCP_SERVERS — merge global + optional project servers
  ipcMain.handle(IPC_CHANNELS.GET_MCP_SERVERS, async (_, projectPath?: string) => {
    const globalData = await readJsonFile(GLOBAL_SETTINGS_PATH);
    const globalServers = parseServers(
      globalData.mcpServers as Record<string, McpServerConfig> | undefined,
      'global',
    );

    let projectServers: McpServerEntry[] = [];
    if (projectPath) {
      const projectConfigPath = path.join(projectPath, '.claude.json');
      const projectData = await readJsonFile(projectConfigPath);
      projectServers = parseServers(
        projectData.mcpServers as Record<string, McpServerConfig> | undefined,
        'project',
        projectPath,
      );
    }

    return [...globalServers, ...projectServers];
  });

  // ADD_MCP_SERVER — write to the appropriate config file
  ipcMain.handle(
    IPC_CHANNELS.ADD_MCP_SERVER,
    async (_, opts: { name: string; config: McpServerConfig; scope: string; projectPath?: string }) => {
      const filePath =
        opts.scope === 'project' && opts.projectPath
          ? path.join(opts.projectPath, '.claude.json')
          : GLOBAL_SETTINGS_PATH;

      const data = await readJsonFile(filePath);
      if (!data.mcpServers || typeof data.mcpServers !== 'object') {
        data.mcpServers = {};
      }
      (data.mcpServers as Record<string, McpServerConfig>)[opts.name] = opts.config;
      await writeJsonFile(filePath, data);

      log('info', 'mcp-servers', `Added MCP server "${opts.name}" to ${opts.scope}`);
      return true;
    },
  );

  // REMOVE_MCP_SERVER — delete from the appropriate config file
  ipcMain.handle(
    IPC_CHANNELS.REMOVE_MCP_SERVER,
    async (_, opts: { name: string; scope: string; projectPath?: string }) => {
      const filePath =
        opts.scope === 'project' && opts.projectPath
          ? path.join(opts.projectPath, '.claude.json')
          : GLOBAL_SETTINGS_PATH;

      const data = await readJsonFile(filePath);
      if (data.mcpServers && typeof data.mcpServers === 'object') {
        delete (data.mcpServers as Record<string, unknown>)[opts.name];
        await writeJsonFile(filePath, data);
      }

      log('info', 'mcp-servers', `Removed MCP server "${opts.name}" from ${opts.scope}`);
      return true;
    },
  );

  // TEST_MCP_SERVER — try to spawn the command and check if it exits cleanly
  ipcMain.handle(
    IPC_CHANNELS.TEST_MCP_SERVER,
    async (_, opts: { command: string; args?: string[] }) => {
      return new Promise<{ status: 'ok' | 'error'; message?: string }>((resolve) => {
        const timeout = 5000;
        let settled = false;

        try {
          const proc = spawn(opts.command, opts.args || ['--version'], {
            stdio: 'pipe',
            timeout,
          });

          const timer = setTimeout(() => {
            if (!settled) {
              settled = true;
              proc.kill();
              // If the process is still running after 5s, it likely started fine
              resolve({ status: 'ok', message: 'Process started successfully' });
            }
          }, timeout);

          let stderr = '';
          proc.stderr?.on('data', (chunk: Buffer) => {
            stderr += chunk.toString();
          });

          proc.on('error', (err) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve({ status: 'error', message: err.message });
            }
          });

          proc.on('close', (code) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              if (code === 0) {
                resolve({ status: 'ok' });
              } else {
                resolve({
                  status: 'error',
                  message: stderr.trim() || `Exited with code ${code}`,
                });
              }
            }
          });
        } catch (err) {
          if (!settled) {
            settled = true;
            resolve({ status: 'error', message: (err as Error).message });
          }
        }
      });
    },
  );

  log('info', 'mcp-servers', 'MCP server handlers registered');
}
