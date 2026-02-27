import { ipcMain } from 'electron';
import { readdirSync, readFileSync, existsSync, statSync, promises as fsPromises } from 'fs';
import path from 'path';
import os from 'os';
import { simpleGit } from 'simple-git';
import { decodeClaudePath } from '../helpers/decode-path';
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

let cachedProjects: Project[] | null = null;

export function registerProjectHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_PROJECTS, async () => {
    if (!cachedProjects) {
      cachedProjects = await discoverProjects();
    }
    return cachedProjects;
  });

  ipcMain.handle(IPC_CHANNELS.GET_PROJECT_DETAIL, async (_, projectPath: string) => {
    return buildProjectSummary(projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.REFRESH_PROJECTS, async () => {
    cachedProjects = await discoverProjects();
    return cachedProjects;
  });
}

async function discoverProjects(): Promise<Project[]> {
  const projectPaths = new Set<string>();

  // 1. Scan ~/.claude/projects/ for registered projects
  try {
    if (existsSync(CLAUDE_PROJECTS_DIR)) {
      const entries = readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const decoded = decodeClaudePath(entry.name);
          if (existsSync(decoded)) {
            projectPaths.add(decoded);
          }
        }
      }
    }
  } catch {
    // Skip silently if Claude projects dir is inaccessible
  }

  // 2. Scan ~/Projects/ and ~/Desktop/ for project directories
  for (const scanDir of SCAN_DIRS) {
    try {
      if (!existsSync(scanDir)) continue;
      const entries = readdirSync(scanDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const fullPath = path.join(scanDir, entry.name);
          // Heuristic: it's a project if it has package.json, .git, or CLAUDE.md
          const hasPackageJson = existsSync(path.join(fullPath, 'package.json'));
          const hasGit = existsSync(path.join(fullPath, '.git'));
          const hasClaudeMd = existsSync(path.join(fullPath, 'CLAUDE.md'));
          const hasClaudeDir = existsSync(path.join(fullPath, '.claude'));
          if (hasPackageJson || hasGit || hasClaudeMd || hasClaudeDir) {
            projectPaths.add(fullPath);
          }
        }
      }
    } catch {
      // Skip silently if scan dir is inaccessible
    }
  }

  // 3. Build project metadata for all discovered paths
  const projects: Project[] = [];
  const allPaths = Array.from(projectPaths);
  for (const projectPath of allPaths) {
    try {
      const project = await buildProjectSummary(projectPath);
      if (project) {
        projects.push(project);
      }
    } catch {
      // Skip malformed projects silently
    }
  }

  // 4. Sort by last activity (newest first)
  projects.sort((a, b) => b.lastActivity - a.lastActivity);

  return projects;
}

async function buildProjectSummary(projectPath: string): Promise<Project | null> {
  try {
    if (!existsSync(projectPath)) return null;

    const name = path.basename(projectPath);
    const hasClaudeDir = existsSync(path.join(projectPath, '.claude'));

    // Find the Claude config path in ~/.claude/projects/
    let claudeConfigPath: string | null = null;
    try {
      if (existsSync(CLAUDE_PROJECTS_DIR)) {
        const entries = readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const decoded = decodeClaudePath(entry.name);
            if (decoded === projectPath) {
              claudeConfigPath = path.join(CLAUDE_PROJECTS_DIR, entry.name);
              break;
            }
          }
        }
      }
    } catch {
      // Skip silently
    }

    // Read PLAN.md
    let plan: string | null = null;
    try {
      const planPath = path.join(projectPath, 'PLAN.md');
      if (existsSync(planPath)) {
        plan = readFileSync(planPath, 'utf-8');
      }
    } catch {
      // Skip silently
    }

    // Read CLAUDE.md
    let claudeMd: string | null = null;
    try {
      const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
      if (existsSync(claudeMdPath)) {
        claudeMd = readFileSync(claudeMdPath, 'utf-8');
      }
    } catch {
      // Skip silently
    }

    // Get git info
    const git = await getGitInfo(projectPath);

    // Get project health indicators (only meaningful for git repos)
    let health: ProjectHealth | null = null;
    const gitDir = path.join(projectPath, '.git');
    if (existsSync(gitDir)) {
      const gitInstance = simpleGit(projectPath);
      health = await getProjectHealth(projectPath, gitInstance);
    }

    // Get package.json info
    const packageJson = readPackageJson(projectPath);

    // Get tasks and teams
    const tasks = getTasksForProject(projectPath);
    const teams = getTeamsForProject(projectPath);

    // Determine last activity time
    let lastActivity = 0;
    try {
      const stat = statSync(projectPath);
      lastActivity = stat.mtimeMs;
    } catch {
      // Skip silently
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
      health,
    };
  } catch {
    return null;
  }
}

async function getGitInfo(projectPath: string): Promise<GitInfo | null> {
  try {
    const gitDir = path.join(projectPath, '.git');
    if (!existsSync(gitDir)) return null;

    const git = simpleGit(projectPath);

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
  } catch {
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
    } catch {
      // If git status fails, leave at 0
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
    } catch {
      // Leave as null if log fails
    }

    // Check if package.json is newer than package-lock.json (deps may be outdated)
    let hasOutdatedDeps = false;
    try {
      const pkgPath = path.join(projectPath, 'package.json');
      const lockPath = path.join(projectPath, 'package-lock.json');
      if (existsSync(pkgPath) && existsSync(lockPath)) {
        const [pkgStat, lockStat] = await Promise.all([
          fsPromises.stat(pkgPath),
          fsPromises.stat(lockPath),
        ]);
        hasOutdatedDeps = pkgStat.mtimeMs > lockStat.mtimeMs;
      }
    } catch {
      // Leave as false if stat fails
    }

    return { uncommittedCount, daysSinceLastCommit, hasOutdatedDeps };
  } catch {
    return null;
  }
}

function getTasksForProject(projectPath: string): TaskItem[] {
  const tasks: TaskItem[] = [];

  try {
    if (!existsSync(CLAUDE_TASKS_DIR)) return tasks;

    const taskDirs = readdirSync(CLAUDE_TASKS_DIR, { withFileTypes: true });
    for (const dir of taskDirs) {
      if (!dir.isDirectory()) continue;

      const taskDirPath = path.join(CLAUDE_TASKS_DIR, dir.name);
      try {
        const files = readdirSync(taskDirPath);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          try {
            const content = readFileSync(path.join(taskDirPath, file), 'utf-8');
            const parsed = JSON.parse(content);

            // Check if this task is related to the project
            // Tasks may reference the project in their metadata or description
            if (parsed && typeof parsed === 'object') {
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
          } catch {
            // Skip malformed JSON files
          }
        }
      } catch {
        // Skip inaccessible task directories
      }
    }
  } catch {
    // Skip silently
  }

  return tasks;
}

function getTeamsForProject(projectPath: string): Team[] {
  const teams: Team[] = [];

  try {
    if (!existsSync(CLAUDE_TEAMS_DIR)) return teams;

    const teamDirs = readdirSync(CLAUDE_TEAMS_DIR, { withFileTypes: true });
    for (const dir of teamDirs) {
      if (!dir.isDirectory()) continue;

      const configPath = path.join(CLAUDE_TEAMS_DIR, dir.name, 'config.json');
      try {
        if (!existsSync(configPath)) continue;

        const content = readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(content);

        if (parsed && typeof parsed === 'object') {
          const members = Array.isArray(parsed.members) ? parsed.members : [];

          // Check if any team member's cwd starts with the project path
          const isRelated = members.some(
            (m: any) => m.cwd && typeof m.cwd === 'string' && m.cwd.startsWith(projectPath)
          );

          if (isRelated) {
            const team: Team = {
              name: parsed.name || dir.name,
              description: parsed.description || '',
              createdAt: parsed.createdAt || 0,
              leadAgentId: parsed.leadAgentId || '',
              members: members.map((m: any) => ({
                agentId: m.agentId || '',
                name: m.name || '',
                agentType: m.agentType || '',
                model: m.model || '',
                color: m.color || '',
                joinedAt: m.joinedAt || 0,
                cwd: m.cwd || '',
              })),
            };
            teams.push(team);
          }
        }
      } catch {
        // Skip malformed team configs
      }
    }
  } catch {
    // Skip silently
  }

  return teams;
}

function readPackageJson(projectPath: string): PackageJsonInfo | null {
  try {
    const pkgPath = path.join(projectPath, 'package.json');
    if (!existsSync(pkgPath)) return null;

    const content = readFileSync(pkgPath, 'utf-8');
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
