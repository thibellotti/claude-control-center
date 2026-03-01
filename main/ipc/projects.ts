import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { simpleGit } from 'simple-git';
import { decodeClaudePath } from '../helpers/decode-path';
import { log } from '../helpers/logger';
import {
  IPC_CHANNELS,
  Project,
  GitInfo,
  ProjectHealth,
  TaskItem,
  Team,
  PackageJsonInfo,
} from '../../shared/types';

const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, '.claude');
const CLAUDE_PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
const CLAUDE_TASKS_DIR = path.join(CLAUDE_DIR, 'tasks');
const CLAUDE_TEAMS_DIR = path.join(CLAUDE_DIR, 'teams');

// Directories to scan for projects
const SCAN_DIRS = [
  path.join(HOME, 'Projects'),
  path.join(HOME, 'Desktop'),
];

// Cache with TTL
const CACHE_TTL_MS = 60_000;
let projectCache: { data: Project[]; timestamp: number } | null = null;

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export function invalidateProjectCache(): void {
  projectCache = null;
}

export function registerProjectHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_PROJECTS, async () => {
    if (projectCache && (Date.now() - projectCache.timestamp) < CACHE_TTL_MS) {
      return projectCache.data;
    }
    const projects = await discoverProjects();
    projectCache = { data: projects, timestamp: Date.now() };
    return projects;
  });

  ipcMain.handle(IPC_CHANNELS.GET_PROJECT_DETAIL, async (_, projectPath: string) => {
    return buildProjectSummary(projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.REFRESH_PROJECTS, async () => {
    invalidateProjectCache();
    const projects = await discoverProjects();
    projectCache = { data: projects, timestamp: Date.now() };
    return projects;
  });
}

async function discoverProjects(): Promise<Project[]> {
  const projectPaths = new Set<string>();

  // 1. Scan ~/.claude/projects/ for registered projects
  try {
    if (await pathExists(CLAUDE_PROJECTS_DIR)) {
      const entries = await fs.readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const decoded = await decodeClaudePath(entry.name);
          if (await pathExists(decoded)) {
            projectPaths.add(decoded);
          }
        }
      }
    }
  } catch (error: unknown) {
    log('warn', 'projects', 'Failed to scan Claude projects directory', error);
  }

  // 2. Scan ~/Projects/ and ~/Desktop/ for project directories
  for (const scanDir of SCAN_DIRS) {
    try {
      if (!(await pathExists(scanDir))) continue;
      const entries = await fs.readdir(scanDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const fullPath = path.join(scanDir, entry.name);
          // Heuristic: it's a project if it has package.json, .git, or CLAUDE.md
          const [hasPackageJson, hasGit, hasClaudeMd, hasClaudeDir] = await Promise.all([
            pathExists(path.join(fullPath, 'package.json')),
            pathExists(path.join(fullPath, '.git')),
            pathExists(path.join(fullPath, 'CLAUDE.md')),
            pathExists(path.join(fullPath, '.claude')),
          ]);
          if (hasPackageJson || hasGit || hasClaudeMd || hasClaudeDir) {
            projectPaths.add(fullPath);
          }
        }
      }
    } catch (error: unknown) {
      log('warn', 'projects', `Failed to scan directory: ${scanDir}`, error);
    }
  }

  // 3. Build project metadata for all discovered paths
  const projects: Project[] = [];
  const allPaths = Array.from(projectPaths);
  const results = await Promise.allSettled(
    allPaths.map((projectPath) => buildProjectSummary(projectPath))
  );
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      projects.push(result.value);
    }
  }

  // 4. Sort by last activity (newest first)
  projects.sort((a, b) => b.lastActivity - a.lastActivity);

  return projects;
}

function parseClient(claudeMd: string | null): string | null {
  if (!claudeMd) return null;
  const match = claudeMd.match(/^client:\s*(.+)$/mi);
  return match ? match[1].trim() : null;
}

async function buildProjectSummary(projectPath: string): Promise<Project | null> {
  try {
    if (!(await pathExists(projectPath))) return null;

    const name = path.basename(projectPath);
    const hasClaudeDir = await pathExists(path.join(projectPath, '.claude'));

    // Find the Claude config path in ~/.claude/projects/
    let claudeConfigPath: string | null = null;
    try {
      if (await pathExists(CLAUDE_PROJECTS_DIR)) {
        const entries = await fs.readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const decoded = await decodeClaudePath(entry.name);
            if (decoded === projectPath) {
              claudeConfigPath = path.join(CLAUDE_PROJECTS_DIR, entry.name);
              break;
            }
          }
        }
      }
    } catch (error: unknown) {
      log('warn', 'projects', `Failed to find Claude config for ${name}`, error);
    }

    // Read PLAN.md
    let plan: string | null = null;
    try {
      plan = await fs.readFile(path.join(projectPath, 'PLAN.md'), 'utf-8');
    } catch {
      // File doesn't exist — expected
    }

    // Read CLAUDE.md
    let claudeMd: string | null = null;
    try {
      claudeMd = await fs.readFile(path.join(projectPath, 'CLAUDE.md'), 'utf-8');
    } catch {
      // File doesn't exist — expected
    }

    // Get git info, package.json, tasks, teams in parallel
    const gitDir = path.join(projectPath, '.git');
    const hasGitDir = await pathExists(gitDir);

    const [git, packageJson, tasks, teams] = await Promise.all([
      getGitInfo(projectPath),
      readPackageJson(projectPath),
      getTasksForProject(projectPath),
      getTeamsForProject(projectPath),
    ]);

    // Get project health (only meaningful for git repos)
    let health: ProjectHealth | null = null;
    if (hasGitDir) {
      const gitInstance = simpleGit({ baseDir: projectPath, timeout: { block: 5000 } });
      health = await getProjectHealth(projectPath, gitInstance);
    }

    // Determine last activity time
    let lastActivity = 0;
    try {
      const stat = await fs.stat(projectPath);
      lastActivity = stat.mtimeMs;
    } catch (error: unknown) {
      log('warn', 'projects', `Failed to stat project directory: ${name}`, error);
    }

    // If git has a last commit date, use that if more recent
    if (git?.lastCommit?.date) {
      const commitTime = new Date(git.lastCommit.date).getTime();
      if (commitTime > lastActivity) {
        lastActivity = commitTime;
      }
    }

    // Determine status based on activity
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const status: 'active' | 'idle' = (Date.now() - lastActivity) < ONE_DAY ? 'active' : 'idle';

    // Generate a stable ID from the path
    const id = projectPath.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');

    return {
      id,
      name,
      path: projectPath,
      claudeConfigPath,
      git,
      plan,
      claudeMd,
      packageJson,
      tasks,
      teams,
      lastActivity,
      status,
      hasClaudeDir,
      client: parseClient(claudeMd),
      health,
    };
  } catch (error: unknown) {
    log('warn', 'projects', `Failed to build summary for ${projectPath}`, error);
    return null;
  }
}

async function getGitInfo(projectPath: string): Promise<GitInfo | null> {
  try {
    const gitDir = path.join(projectPath, '.git');
    if (!(await pathExists(gitDir))) return null;

    const git = simpleGit({ baseDir: projectPath, timeout: { block: 5000 } });

    const [statusResult, logResult, remotes] = await Promise.all([
      git.status().catch(() => null),
      git.log({ maxCount: 1 }).catch(() => null),
      git.getRemotes(true).catch(() => []),
    ]);

    const branch = statusResult?.current || 'unknown';
    const isDirty = statusResult
      ? (statusResult.modified.length > 0 ||
         statusResult.not_added.length > 0 ||
         statusResult.staged.length > 0 ||
         statusResult.deleted.length > 0)
      : false;

    const lastCommit = logResult?.latest
      ? {
          hash: logResult.latest.hash,
          message: logResult.latest.message,
          date: logResult.latest.date,
          author: logResult.latest.author_name,
        }
      : null;

    const remoteUrl = remotes.length > 0 ? remotes[0].refs?.fetch || null : null;

    return {
      branch,
      status: isDirty ? 'dirty' : 'clean',
      lastCommit,
      remoteUrl,
      ahead: statusResult?.ahead || 0,
      behind: statusResult?.behind || 0,
    };
  } catch (error: unknown) {
    log('warn', 'git', `Failed to get git info for ${projectPath}`, error);
    return null;
  }
}

async function getProjectHealth(
  projectPath: string,
  git: ReturnType<typeof simpleGit>
): Promise<ProjectHealth | null> {
  try {
    // Count uncommitted files (modified + staged + untracked + deleted)
    let uncommittedCount = 0;
    try {
      const statusResult = await git.status();
      uncommittedCount = statusResult.files.length;
    } catch (error: unknown) {
      log('warn', 'health', `Git status failed for ${projectPath}`, error);
    }

    // Calculate days since last commit
    let daysSinceLastCommit: number | null = null;
    try {
      const logResult = await git.log({ maxCount: 1 });
      if (logResult?.latest?.date) {
        const lastCommitTime = new Date(logResult.latest.date).getTime();
        const msPerDay = 24 * 60 * 60 * 1000;
        daysSinceLastCommit = Math.floor((Date.now() - lastCommitTime) / msPerDay);
      }
    } catch (error: unknown) {
      log('warn', 'health', `Git log failed for ${projectPath}`, error);
    }

    // Check if package.json is newer than package-lock.json (deps may be outdated)
    let hasOutdatedDeps = false;
    try {
      const pkgPath = path.join(projectPath, 'package.json');
      const lockPath = path.join(projectPath, 'package-lock.json');
      if ((await pathExists(pkgPath)) && (await pathExists(lockPath))) {
        const [pkgStat, lockStat] = await Promise.all([
          fs.stat(pkgPath),
          fs.stat(lockPath),
        ]);
        hasOutdatedDeps = pkgStat.mtimeMs > lockStat.mtimeMs;
      }
    } catch (error: unknown) {
      log('warn', 'health', `Outdated deps check failed for ${projectPath}`, error);
    }

    return { uncommittedCount, daysSinceLastCommit, hasOutdatedDeps };
  } catch (error: unknown) {
    log('warn', 'health', `Health check failed for ${projectPath}`, error);
    return null;
  }
}

async function getTasksForProject(_projectPath: string): Promise<TaskItem[]> {
  const tasks: TaskItem[] = [];

  try {
    if (!(await pathExists(CLAUDE_TASKS_DIR))) return tasks;

    const taskDirs = await fs.readdir(CLAUDE_TASKS_DIR, { withFileTypes: true });
    for (const dir of taskDirs) {
      if (!dir.isDirectory()) continue;

      const taskDirPath = path.join(CLAUDE_TASKS_DIR, dir.name);
      try {
        const files = await fs.readdir(taskDirPath);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          try {
            const content = await fs.readFile(path.join(taskDirPath, file), 'utf-8');
            const parsed = JSON.parse(content);

            if (parsed && typeof parsed === 'object') {
              // Skip deleted tasks entirely
              if (parsed.status === 'deleted') continue;

              const task: TaskItem = {
                id: parsed.id || file.replace('.json', ''),
                subject: parsed.subject || '',
                description: parsed.description || '',
                activeForm: parsed.activeForm || '',
                owner: parsed.owner || '',
                status: parsed.status || 'pending',
                blocks: parsed.blocks || [],
                blockedBy: parsed.blockedBy || [],
                metadata: parsed.metadata || {},
              };
              tasks.push(task);
            }
          } catch (error: unknown) {
            log('warn', 'tasks', `Failed to parse task file: ${file}`, error);
          }
        }
      } catch (error: unknown) {
        log('warn', 'tasks', `Failed to read task directory: ${dir.name}`, error);
      }
    }
  } catch (error: unknown) {
    log('warn', 'tasks', 'Failed to scan tasks directory', error);
  }

  return tasks;
}

async function getTeamsForProject(projectPath: string): Promise<Team[]> {
  const teams: Team[] = [];

  try {
    if (!(await pathExists(CLAUDE_TEAMS_DIR))) return teams;

    const teamDirs = await fs.readdir(CLAUDE_TEAMS_DIR, { withFileTypes: true });
    for (const dir of teamDirs) {
      if (!dir.isDirectory()) continue;

      const configPath = path.join(CLAUDE_TEAMS_DIR, dir.name, 'config.json');
      try {
        if (!(await pathExists(configPath))) continue;

        const content = await fs.readFile(configPath, 'utf-8');
        const parsed = JSON.parse(content);

        if (parsed && typeof parsed === 'object') {
          const members = Array.isArray(parsed.members) ? parsed.members : [];

          // Check if any team member's cwd starts with the project path
          const isRelated = members.some(
            (m: Record<string, unknown>) => m.cwd && typeof m.cwd === 'string' && (m.cwd as string).startsWith(projectPath)
          );

          if (isRelated) {
            const team: Team = {
              name: parsed.name || dir.name,
              description: parsed.description || '',
              createdAt: parsed.createdAt || 0,
              leadAgentId: parsed.leadAgentId || '',
              members: members.map((m: Record<string, unknown>) => ({
                agentId: (m.agentId as string) || '',
                name: (m.name as string) || '',
                agentType: (m.agentType as string) || '',
                model: (m.model as string) || '',
                color: (m.color as string) || '',
                joinedAt: (m.joinedAt as number) || 0,
                cwd: (m.cwd as string) || '',
              })),
            };
            teams.push(team);
          }
        }
      } catch (error: unknown) {
        log('warn', 'teams', `Failed to parse team config: ${dir.name}`, error);
      }
    }
  } catch (error: unknown) {
    log('warn', 'teams', 'Failed to scan teams directory', error);
  }

  return teams;
}

async function readPackageJson(projectPath: string): Promise<PackageJsonInfo | null> {
  try {
    const pkgPath = path.join(projectPath, 'package.json');
    const content = await fs.readFile(pkgPath, 'utf-8');
    const parsed = JSON.parse(content);

    return {
      name: parsed.name || '',
      version: parsed.version || '',
      scripts: parsed.scripts || {},
      dependencies: parsed.dependencies || {},
      devDependencies: parsed.devDependencies || {},
    };
  } catch {
    return null;
  }
}
