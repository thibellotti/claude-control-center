import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { simpleGit } from 'simple-git';
import { IPC_CHANNELS, HandoffPackage } from '../../shared/types';
import { log } from '../helpers/logger';

const HOME = os.homedir();
const CLAUDE_TASKS_DIR = path.join(HOME, '.claude', 'tasks');

// Directories to skip when generating the file tree
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.cache',
  '.turbo',
  '.vercel',
  '.output',
  'coverage',
  '__pycache__',
  '.DS_Store',
]);

// Known tech identifiers detected from package.json dependencies
const TECH_IDENTIFIERS: Record<string, string> = {
  react: 'React',
  'react-dom': 'React DOM',
  next: 'Next.js',
  vue: 'Vue',
  nuxt: 'Nuxt',
  svelte: 'Svelte',
  '@sveltejs/kit': 'SvelteKit',
  angular: 'Angular',
  '@angular/core': 'Angular',
  tailwindcss: 'TailwindCSS',
  typescript: 'TypeScript',
  three: 'Three.js',
  electron: 'Electron',
  express: 'Express',
  fastify: 'Fastify',
  prisma: 'Prisma',
  '@prisma/client': 'Prisma',
  drizzle: 'Drizzle',
  'drizzle-orm': 'Drizzle ORM',
  '@supabase/supabase-js': 'Supabase',
  firebase: 'Firebase',
  vite: 'Vite',
  webpack: 'Webpack',
  jest: 'Jest',
  vitest: 'Vitest',
  playwright: 'Playwright',
  cypress: 'Cypress',
  eslint: 'ESLint',
  prettier: 'Prettier',
  'framer-motion': 'Framer Motion',
  gsap: 'GSAP',
  'styled-components': 'Styled Components',
  '@emotion/react': 'Emotion',
  sass: 'Sass',
  graphql: 'GraphQL',
  '@tanstack/react-query': 'TanStack Query',
  zustand: 'Zustand',
  redux: 'Redux',
  '@reduxjs/toolkit': 'Redux Toolkit',
  mongoose: 'Mongoose',
  sequelize: 'Sequelize',
  'socket.io': 'Socket.io',
  stripe: 'Stripe',
};

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export function registerHandoffHandlers() {
  ipcMain.handle(
    IPC_CHANNELS.GENERATE_HANDOFF,
    async (_event, projectPath: string): Promise<HandoffPackage> => {
      return generateHandoff(projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXPORT_HANDOFF,
    async (
      _event,
      projectPath: string,
      format: 'markdown' | 'json'
    ): Promise<{ filePath: string }> => {
      const handoff = await generateHandoff(projectPath);
      return exportHandoff(projectPath, handoff, format);
    }
  );
}

async function generateHandoff(projectPath: string): Promise<HandoffPackage> {
  const projectName = path.basename(projectPath);

  // Read CLAUDE.md
  const overview = await readOptionalFile(path.join(projectPath, 'CLAUDE.md'));

  // Read PLAN.md
  const plan = await readOptionalFile(path.join(projectPath, 'PLAN.md'));

  // Git info
  let gitBranch: string | null = null;
  let gitStatus: string | null = null;
  let recentCommits: HandoffPackage['recentCommits'] = [];

  const gitDir = path.join(projectPath, '.git');
  if (await pathExists(gitDir)) {
    try {
      const git = simpleGit({ baseDir: projectPath, timeout: { block: 5000 } });
      const [status, gitLog] = await Promise.all([
        git.status().catch(() => null),
        git.log({ maxCount: 10 }).catch(() => null),
      ]);

      if (status) {
        gitBranch = status.current || null;
        const fileCount = status.files.length;
        gitStatus = fileCount === 0 ? 'clean' : `dirty (${fileCount} modified files)`;
      }

      if (gitLog && gitLog.all) {
        recentCommits = gitLog.all.map((entry: { hash: string; message: string; date: string; author_name: string }) => ({
          hash: entry.hash.slice(0, 7),
          message: entry.message,
          date: entry.date,
          author: entry.author_name,
        }));
      }
    } catch (error: unknown) {
      log('warn', 'handoff', `Git operations failed for project: ${projectPath}`, error);
    }
  }

  // Tasks from ~/.claude/tasks/
  const tasks = await getTasksForHandoff(projectPath);

  // File tree
  const fileTree = await generateFileTree(projectPath, 3);

  // Tech stack and dependencies from package.json
  let techStack: string[] = [];
  let dependencies: Record<string, string> = {};

  const pkgPath = path.join(projectPath, 'package.json');
  if (await pathExists(pkgPath)) {
    try {
      const raw = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(raw);
      const allDeps: Record<string, string> = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };

      // Detect tech stack
      const detected = new Set<string>();
      for (const depName of Object.keys(allDeps)) {
        if (TECH_IDENTIFIERS[depName]) {
          detected.add(TECH_IDENTIFIERS[depName]);
        }
      }
      techStack = Array.from(detected).sort();

      // Merge dependencies for the output
      dependencies = allDeps;
    } catch (error: unknown) {
      log('warn', 'handoff', `Failed to parse package.json at: ${pkgPath}`, error);
    }
  }

  return {
    projectName,
    projectPath,
    generatedAt: Date.now(),
    overview,
    plan,
    gitBranch,
    gitStatus,
    recentCommits,
    tasks,
    fileTree,
    techStack,
    dependencies,
  };
}

async function exportHandoff(
  projectPath: string,
  handoff: HandoffPackage,
  format: 'markdown' | 'json'
): Promise<{ filePath: string }> {
  if (format === 'json') {
    const filePath = path.join(projectPath, 'HANDOFF.json');
    await fs.writeFile(filePath, JSON.stringify(handoff, null, 2), 'utf-8');
    return { filePath };
  }

  // Markdown format
  const md = buildMarkdown(handoff);
  const filePath = path.join(projectPath, 'HANDOFF.md');
  await fs.writeFile(filePath, md, 'utf-8');
  return { filePath };
}

function buildMarkdown(h: HandoffPackage): string {
  const date = new Date(h.generatedAt).toISOString().replace('T', ' ').slice(0, 19);
  const lines: string[] = [];

  lines.push(`# ${h.projectName} -- Handoff Document`);
  lines.push('');
  lines.push(`Generated: ${date}`);
  lines.push('');

  // Overview
  lines.push('## Overview');
  lines.push('');
  lines.push(h.overview || 'No CLAUDE.md found.');
  lines.push('');

  // Plan
  lines.push('## Current Plan');
  lines.push('');
  lines.push(h.plan || 'No plan document found.');
  lines.push('');

  // Git Status
  lines.push('## Git Status');
  lines.push('');
  if (h.gitBranch) {
    lines.push(`- **Branch:** ${h.gitBranch}`);
    lines.push(`- **Status:** ${h.gitStatus}`);
  } else {
    lines.push('Not a git repository.');
  }
  lines.push('');

  if (h.recentCommits.length > 0) {
    lines.push('### Recent Commits');
    lines.push('');
    for (const c of h.recentCommits) {
      lines.push(`- \`${c.hash}\` ${c.message} (${c.date}, ${c.author})`);
    }
    lines.push('');
  }

  // Tasks
  lines.push('## Active Tasks');
  lines.push('');
  if (h.tasks.length > 0) {
    lines.push('| Task | Status | Owner |');
    lines.push('|------|--------|-------|');
    for (const t of h.tasks) {
      lines.push(`| ${t.subject} | ${t.status} | ${t.owner || '--'} |`);
    }
  } else {
    lines.push('No active tasks found.');
  }
  lines.push('');

  // File Structure
  lines.push('## File Structure');
  lines.push('');
  lines.push('```');
  lines.push(h.fileTree || '(empty)');
  lines.push('```');
  lines.push('');

  // Tech Stack
  lines.push('## Tech Stack');
  lines.push('');
  if (h.techStack.length > 0) {
    for (const tech of h.techStack) {
      lines.push(`- ${tech}`);
    }
  } else {
    lines.push('No technologies detected.');
  }
  lines.push('');

  // Dependencies
  lines.push('## Dependencies');
  lines.push('');
  const depEntries = Object.entries(h.dependencies);
  if (depEntries.length > 0) {
    for (const [name, version] of depEntries) {
      lines.push(`- \`${name}\`: ${version}`);
    }
  } else {
    lines.push('No dependencies found.');
  }
  lines.push('');

  return lines.join('\n');
}

async function readOptionalFile(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error: unknown) {
    log('warn', 'handoff', `Could not read optional file: ${filePath}`, error);
  }
  return null;
}

async function getTasksForHandoff(
  _projectPath: string
): Promise<{ subject: string; status: string; owner: string }[]> {
  const tasks: { subject: string; status: string; owner: string }[] = [];

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
            if (parsed && typeof parsed === 'object' && parsed.status !== 'deleted') {
              tasks.push({
                subject: parsed.subject || '',
                status: parsed.status || 'pending',
                owner: parsed.owner || '',
              });
            }
          } catch (error: unknown) {
            log('warn', 'handoff', `Failed to read task file: ${file}`, error);
          }
        }
      } catch (error: unknown) {
        log('warn', 'handoff', `Failed to read task directory: ${taskDirPath}`, error);
      }
    }
  } catch (error: unknown) {
    log('warn', 'handoff', 'Failed to read tasks root directory', error);
  }

  return tasks;
}

/**
 * Generate an indented file tree with box-drawing characters.
 * Skips common build/dependency directories for efficiency.
 */
async function generateFileTree(dirPath: string, maxDepth: number): Promise<string> {
  const lines: string[] = [];

  async function walk(currentPath: string, prefix: string, depth: number) {
    if (depth > maxDepth) return;

    let entries: { name: string; isDir: boolean }[] = [];
    try {
      const dirEntries = await fs.readdir(currentPath, { withFileTypes: true });
      entries = dirEntries
        .filter((e) => !e.name.startsWith('.') || e.name === '.claude')
        .filter((e) => !SKIP_DIRS.has(e.name))
        .map((e) => ({ name: e.name, isDir: e.isDirectory() }))
        .sort((a, b) => {
          // Directories first, then alphabetical
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
    } catch (error: unknown) {
      log('warn', 'handoff', `Failed to read directory for file tree: ${currentPath}`, error);
      return;
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const isLast = i === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';
      const displayName = entry.isDir ? `${entry.name}/` : entry.name;

      lines.push(`${prefix}${connector}${displayName}`);

      if (entry.isDir) {
        await walk(path.join(currentPath, entry.name), `${prefix}${childPrefix}`, depth + 1);
      }
    }
  }

  lines.push(path.basename(dirPath) + '/');
  await walk(dirPath, '', 1);

  return lines.join('\n');
}
