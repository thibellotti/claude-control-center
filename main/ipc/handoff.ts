import { ipcMain } from 'electron';
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import os from 'os';
import { simpleGit } from 'simple-git';
import { IPC_CHANNELS, HandoffPackage } from '../../shared/types';

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
  const overview = readOptionalFile(path.join(projectPath, 'CLAUDE.md'));

  // Read PLAN.md
  const plan = readOptionalFile(path.join(projectPath, 'PLAN.md'));

  // Git info
  let gitBranch: string | null = null;
  let gitStatus: string | null = null;
  let recentCommits: HandoffPackage['recentCommits'] = [];

  const gitDir = path.join(projectPath, '.git');
  if (existsSync(gitDir)) {
    try {
      const git = simpleGit(projectPath);
      const [status, log] = await Promise.all([
        git.status().catch(() => null),
        git.log({ maxCount: 10 }).catch(() => null),
      ]);

      if (status) {
        gitBranch = status.current || null;
        const fileCount = status.files.length;
        gitStatus = fileCount === 0 ? 'clean' : `dirty (${fileCount} modified files)`;
      }

      if (log && log.all) {
        recentCommits = log.all.map((entry) => ({
          hash: entry.hash.slice(0, 7),
          message: entry.message,
          date: entry.date,
          author: entry.author_name,
        }));
      }
    } catch {
      // Git operations failed, leave defaults
    }
  }

  // Tasks from ~/.claude/tasks/
  const tasks = getTasksForHandoff(projectPath);

  // File tree
  const fileTree = generateFileTree(projectPath, 3);

  // Tech stack and dependencies from package.json
  let techStack: string[] = [];
  let dependencies: Record<string, string> = {};

  const pkgPath = path.join(projectPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
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
    } catch {
      // package.json parse failed
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

function exportHandoff(
  projectPath: string,
  handoff: HandoffPackage,
  format: 'markdown' | 'json'
): { filePath: string } {
  if (format === 'json') {
    const filePath = path.join(projectPath, 'HANDOFF.json');
    writeFileSync(filePath, JSON.stringify(handoff, null, 2), 'utf-8');
    return { filePath };
  }

  // Markdown format
  const md = buildMarkdown(handoff);
  const filePath = path.join(projectPath, 'HANDOFF.md');
  writeFileSync(filePath, md, 'utf-8');
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

function readOptionalFile(filePath: string): string | null {
  try {
    if (existsSync(filePath)) {
      return readFileSync(filePath, 'utf-8');
    }
  } catch {
    // File unreadable
  }
  return null;
}

function getTasksForHandoff(
  _projectPath: string
): { subject: string; status: string; owner: string }[] {
  const tasks: { subject: string; status: string; owner: string }[] = [];

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
            if (parsed && typeof parsed === 'object' && parsed.status !== 'deleted') {
              tasks.push({
                subject: parsed.subject || '',
                status: parsed.status || 'pending',
                owner: parsed.owner || '',
              });
            }
          } catch {
            // Skip malformed task files
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    }
  } catch {
    // Skip silently
  }

  return tasks;
}

/**
 * Generate an indented file tree with box-drawing characters.
 * Skips common build/dependency directories for efficiency.
 */
function generateFileTree(dirPath: string, maxDepth: number): string {
  const lines: string[] = [];

  function walk(currentPath: string, prefix: string, depth: number) {
    if (depth > maxDepth) return;

    let entries: { name: string; isDir: boolean }[] = [];
    try {
      const dirEntries = readdirSync(currentPath, { withFileTypes: true });
      entries = dirEntries
        .filter((e) => !e.name.startsWith('.') || e.name === '.claude')
        .filter((e) => !SKIP_DIRS.has(e.name))
        .map((e) => ({ name: e.name, isDir: e.isDirectory() }))
        .sort((a, b) => {
          // Directories first, then alphabetical
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
    } catch {
      return;
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const isLast = i === entries.length - 1;
      const connector = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 ';
      const childPrefix = isLast ? '    ' : '\u2502   ';
      const displayName = entry.isDir ? `${entry.name}/` : entry.name;

      lines.push(`${prefix}${connector}${displayName}`);

      if (entry.isDir) {
        walk(path.join(currentPath, entry.name), `${prefix}${childPrefix}`, depth + 1);
      }
    }
  }

  lines.push(path.basename(dirPath) + '/');
  walk(dirPath, '', 1);

  return lines.join('\n');
}
