import { ipcMain } from 'electron';
import { spawn, exec, execFileSync } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';
import { IPC_CHANNELS, DeployConfig, DeployResult, VercelDeployment, VercelProjectInfo } from '../../shared/types';
import { log } from '../helpers/logger';

const execAsync = promisify(exec);

/** Return a copy of process.env without Claude Code session vars */
function cleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_SESSION;
  return env;
}

const HOME = os.homedir();
const DEPLOYS_DIR = path.join(HOME, '.claude', 'studio', 'deploys');

// Ensure the deploys directory exists
function ensureDeploysDir() {
  if (!existsSync(DEPLOYS_DIR)) {
    mkdirSync(DEPLOYS_DIR, { recursive: true });
  }
}

// Derive a filesystem-safe project ID from its path
function projectIdFromPath(projectPath: string): string {
  return Buffer.from(projectPath).toString('base64url');
}

// Check whether a CLI tool is available on the system
function cliExists(name: string): boolean {
  try {
    execFileSync('which', [name], { stdio: 'ignore' });
    return true;
  } catch (error: unknown) {
    log('warn', 'deploy', `CLI check failed for ${name}`, error);
    return false;
  }
}

// Read deploy history from disk
function readHistory(projectId: string): DeployResult[] {
  ensureDeploysDir();
  const filePath = path.join(DEPLOYS_DIR, `${projectId}.json`);
  if (!existsSync(filePath)) return [];
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch (error: unknown) {
    log('warn', 'deploy', 'Failed to read deploy history', error);
    return [];
  }
}

// Persist a deploy result to history
function saveToHistory(projectId: string, result: DeployResult) {
  ensureDeploysDir();
  const history = readHistory(projectId);
  history.unshift(result);
  // Keep only the last 10 deploys
  const trimmed = history.slice(0, 10);
  const filePath = path.join(DEPLOYS_DIR, `${projectId}.json`);
  writeFileSync(filePath, JSON.stringify(trimmed, null, 2), 'utf-8');
}

export function registerDeployHandlers() {
  // -------------------------------------------------------
  // DETECT_DEPLOY_PROVIDER
  // -------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.DETECT_DEPLOY_PROVIDER,
    async (_event, projectPath: string): Promise<DeployConfig> => {
      const hasVercelCli = cliExists('vercel');
      const hasNetlifyCli = cliExists('netlify');

      // Check project-level config files
      const hasVercelDir = existsSync(path.join(projectPath, '.vercel'));
      const hasVercelJson = existsSync(path.join(projectPath, 'vercel.json'));
      const hasNetlifyDir = existsSync(path.join(projectPath, '.netlify'));
      const hasNetlifyToml = existsSync(path.join(projectPath, 'netlify.toml'));

      let provider: DeployConfig['provider'] = 'none';

      // Prefer project-level signals first, then fall back to CLI availability
      if ((hasVercelDir || hasVercelJson) && hasVercelCli) {
        provider = 'vercel';
      } else if ((hasNetlifyDir || hasNetlifyToml) && hasNetlifyCli) {
        provider = 'netlify';
      } else if (hasVercelCli) {
        provider = 'vercel';
      } else if (hasNetlifyCli) {
        provider = 'netlify';
      }

      // Pull last deploy info from history
      const projectId = projectIdFromPath(projectPath);
      const history = readHistory(projectId);
      const last = history[0];

      return {
        provider,
        lastDeployUrl: last?.url,
        lastDeployTime: last?.timestamp,
        lastDeployStatus: last ? (last.success ? 'success' : 'error') : undefined,
      };
    }
  );

  // -------------------------------------------------------
  // DEPLOY_PROJECT
  // -------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.DEPLOY_PROJECT,
    async (
      _event,
      projectPath: string,
      provider: 'vercel' | 'netlify'
    ): Promise<DeployResult> => {
      const command =
        provider === 'vercel'
          ? 'vercel --yes --prod'
          : 'netlify deploy --prod';

      return new Promise<DeployResult>((resolve) => {
        const output: string[] = [];
        let deployUrl: string | undefined;

        const child = spawn('sh', ['-c', command], {
          cwd: projectPath,
          env: cleanEnv(),
        });

        child.stdout?.on('data', (data: Buffer) => {
          const text = data.toString();
          output.push(text);
        });

        child.stderr?.on('data', (data: Buffer) => {
          const text = data.toString();
          output.push(text);
        });

        child.on('close', (code) => {
          // Attempt to extract the deployed URL from the output
          const fullOutput = output.join('');

          if (provider === 'vercel') {
            // Vercel prints the production URL — usually the last https:// line
            const urlMatches = fullOutput.match(/https:\/\/[^\s]+/g);
            if (urlMatches && urlMatches.length > 0) {
              deployUrl = urlMatches[urlMatches.length - 1];
            }
          } else {
            // Netlify prints "Website URL: https://..."
            const websiteMatch = fullOutput.match(/Website\s+URL:\s*(https:\/\/[^\s]+)/i);
            if (websiteMatch) {
              deployUrl = websiteMatch[1];
            } else {
              // Fallback — grab any https URL
              const urlMatches = fullOutput.match(/https:\/\/[^\s]+/g);
              if (urlMatches && urlMatches.length > 0) {
                deployUrl = urlMatches[urlMatches.length - 1];
              }
            }
          }

          const success = code === 0;
          const result: DeployResult = {
            success,
            url: deployUrl,
            error: success ? undefined : `Process exited with code ${code}`,
            output,
            timestamp: Date.now(),
          };

          // Persist to history
          const projectId = projectIdFromPath(projectPath);
          saveToHistory(projectId, result);

          resolve(result);
        });

        child.on('error', (err) => {
          const result: DeployResult = {
            success: false,
            error: err.message,
            output,
            timestamp: Date.now(),
          };

          const projectId = projectIdFromPath(projectPath);
          saveToHistory(projectId, result);

          resolve(result);
        });
      });
    }
  );

  // -------------------------------------------------------
  // GET_DEPLOY_HISTORY
  // -------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.GET_DEPLOY_HISTORY,
    async (_event, projectPath: string): Promise<DeployResult[]> => {
      const projectId = projectIdFromPath(projectPath);
      return readHistory(projectId);
    }
  );

  // -------------------------------------------------------
  // GET_VERCEL_DEPLOYMENTS
  // -------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.GET_VERCEL_DEPLOYMENTS,
    async (_event, projectPath: string): Promise<{ deployments: VercelDeployment[] }> => {
      try {
        const { stdout } = await execAsync('vercel ls --json 2>/dev/null', {
          cwd: projectPath,
          env: cleanEnv(),
          timeout: 15000,
        });

        const parsed = JSON.parse(stdout);

        // vercel ls --json returns an array of deployment objects
        const deployments: VercelDeployment[] = (Array.isArray(parsed) ? parsed : parsed.deployments || [])
          .slice(0, 20)
          .map((d: Record<string, unknown>) => ({
            url: (d.url as string) || (d.inspectorUrl as string) || '',
            state: ((d.state as string) || (d.readyState as string) || 'UNKNOWN').toUpperCase(),
            createdAt: typeof d.createdAt === 'number' ? d.createdAt : (typeof d.created === 'number' ? d.created : Date.parse(d.createdAt as string || d.created as string || '') || 0),
            source: (d.source as string) || (d.meta && typeof d.meta === 'object' && (d.meta as Record<string, unknown>).source as string) || 'cli',
          }));

        return { deployments };
      } catch (error: unknown) {
        log('warn', 'deploy', 'Failed to fetch Vercel deployments', error);
        return { deployments: [] };
      }
    }
  );

  // -------------------------------------------------------
  // GET_VERCEL_PROJECT_INFO
  // -------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.GET_VERCEL_PROJECT_INFO,
    async (_event, projectPath: string): Promise<VercelProjectInfo> => {
      const result: VercelProjectInfo = {
        detected: false,
        projectName: null,
        productionUrl: null,
        framework: null,
      };

      try {
        // Check .vercel/project.json for project details
        const vercelProjectPath = path.join(projectPath, '.vercel', 'project.json');
        if (existsSync(vercelProjectPath)) {
          result.detected = true;
          try {
            const projectJson = JSON.parse(readFileSync(vercelProjectPath, 'utf-8'));
            result.projectName = projectJson.projectId || null;
          } catch (error: unknown) {
            log('warn', 'deploy', 'Failed to parse .vercel/project.json', error);
          }
        }

        // Check vercel.json for additional config
        const vercelJsonPath = path.join(projectPath, 'vercel.json');
        if (existsSync(vercelJsonPath)) {
          result.detected = true;
          try {
            const vercelJson = JSON.parse(readFileSync(vercelJsonPath, 'utf-8'));
            if (vercelJson.framework) {
              result.framework = vercelJson.framework;
            }
          } catch (error: unknown) {
            log('warn', 'deploy', 'Failed to parse vercel.json', error);
          }
        }

        // Try vercel inspect for richer info
        if (cliExists('vercel')) {
          result.detected = true;
          try {
            const { stdout } = await execAsync('vercel inspect --json 2>/dev/null', {
              cwd: projectPath,
              env: cleanEnv(),
              timeout: 15000,
            });

            const inspectData = JSON.parse(stdout);
            if (inspectData.name) result.projectName = inspectData.name;
            if (inspectData.alias && inspectData.alias.length > 0) {
              result.productionUrl = inspectData.alias[0];
            } else if (inspectData.url) {
              result.productionUrl = inspectData.url;
            }
            if (inspectData.framework) result.framework = inspectData.framework;
          } catch (error: unknown) {
            log('warn', 'deploy', 'Vercel inspect failed (project may not be linked)', error);
          }
        }

        // Fallback: try to derive name from package.json
        if (!result.projectName) {
          const pkgPath = path.join(projectPath, 'package.json');
          if (existsSync(pkgPath)) {
            try {
              const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
              result.projectName = pkg.name || null;
            } catch (error: unknown) {
              log('warn', 'deploy', 'Failed to parse package.json', error);
            }
          }
        }

        return result;
      } catch (error: unknown) {
        log('warn', 'deploy', 'Failed to get Vercel project info', error);
        return result;
      }
    }
  );
}
