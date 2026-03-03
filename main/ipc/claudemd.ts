import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IPC_CHANNELS } from '../../shared/types';
import type { TaskItem } from '../../shared/types';
import { log } from '../helpers/logger';
import { isPathSafe } from '../helpers/path-safety';
import { logSecurityEvent } from '../helpers/security-logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClaudeMdFile {
  path: string;           // absolute path to the CLAUDE.md file
  projectPath: string;    // parent project root
  projectName: string;
  clientName: string | null;
  lastModified: number;   // file mtime as timestamp
}

interface ClaudeMdTree {
  byClient: Record<string, ClaudeMdFile[]>;
}

interface ProjectInput {
  path: string;
  name: string;
  client?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that a CLAUDE.md path is safe:
 * 1. Must be within the user's home directory (prevents path traversal)
 * 2. Must end with CLAUDE.md (prevents arbitrary file access)
 */
function validateClaudeMdPath(filePath: string): void {
  const resolved = path.resolve(filePath);

  if (!isPathSafe(resolved)) {
    logSecurityEvent('path-traversal', 'high', 'CLAUDE.md access blocked: path outside home', {
      filePath,
      resolved,
    });
    throw new Error('Access denied: path is outside the home directory');
  }

  if (!resolved.endsWith('CLAUDE.md')) {
    logSecurityEvent('path-traversal', 'medium', 'CLAUDE.md access blocked: not a CLAUDE.md file', {
      filePath,
      resolved,
    });
    throw new Error('Access denied: path must point to a CLAUDE.md file');
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export function registerClaudeMdHandlers() {
  // Scan all projects for CLAUDE.md files, grouped by client
  ipcMain.handle(
    IPC_CHANNELS.SCAN_CLAUDEMD,
    async (_, projects: ProjectInput[]): Promise<ClaudeMdTree> => {
      const tree: ClaudeMdTree = { byClient: {} };

      const results = await Promise.allSettled(
        projects.map(async (project) => {
          const candidates = [
            path.join(project.path, 'CLAUDE.md'),
            path.join(project.path, '.claude', 'CLAUDE.md'),
          ];

          const found: ClaudeMdFile[] = [];

          for (const candidate of candidates) {
            if (await pathExists(candidate)) {
              try {
                const stat = await fs.stat(candidate);
                found.push({
                  path: candidate,
                  projectPath: project.path,
                  projectName: project.name,
                  clientName: project.client ?? null,
                  lastModified: stat.mtimeMs,
                });
              } catch (err) {
                log('warn', 'claudemd', `Failed to stat ${candidate}`, err);
              }
            }
          }

          return found;
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          for (const file of result.value) {
            const key = file.clientName || 'Uncategorized';
            if (!tree.byClient[key]) {
              tree.byClient[key] = [];
            }
            tree.byClient[key].push(file);
          }
        }
      }

      // Sort files within each client group by project name
      for (const key of Object.keys(tree.byClient)) {
        tree.byClient[key].sort((a, b) => a.projectName.localeCompare(b.projectName));
      }

      return tree;
    }
  );

  // Read a single CLAUDE.md file
  ipcMain.handle(
    IPC_CHANNELS.READ_CLAUDEMD,
    async (_, filePath: string): Promise<string> => {
      validateClaudeMdPath(filePath);
      return fs.readFile(filePath, 'utf-8');
    }
  );

  // Write content to a CLAUDE.md file
  ipcMain.handle(
    IPC_CHANNELS.WRITE_CLAUDEMD,
    async (_, filePath: string, content: string): Promise<void> => {
      validateClaudeMdPath(filePath);
      await fs.writeFile(filePath, content, 'utf-8');
    }
  );

  // Extract TODOs from CLAUDE.md for Kanban board
  ipcMain.handle(
    IPC_CHANNELS.EXTRACT_TODOS,
    async (_, { projectPath }: { projectPath: string }): Promise<TaskItem[]> => {
      const resolved = path.resolve(projectPath);
      if (!isPathSafe(resolved)) {
        throw new Error('Access denied: path is outside the home directory');
      }

      const candidates = [
        path.join(resolved, 'CLAUDE.md'),
        path.join(resolved, '.claude', 'CLAUDE.md'),
      ];

      let content = '';
      for (const candidate of candidates) {
        if (await pathExists(candidate)) {
          try {
            content = await fs.readFile(candidate, 'utf-8');
            break;
          } catch (err) {
            log('warn', 'claudemd', `Failed to read ${candidate}`, err);
          }
        }
      }

      if (!content) return [];

      const tasks: TaskItem[] = [];
      const lines = content.split('\n');
      let inTodoSection = false;

      for (const line of lines) {
        const trimmed = line.trim();

        // Detect headers containing todo/task/plan keywords
        if (/^#{1,6}\s+/i.test(trimmed)) {
          inTodoSection = /task|todo|plan/i.test(trimmed);
        }

        // Checkbox pattern: - [ ] or - [x]
        const checkboxMatch = trimmed.match(/^-\s+\[([ xX])\]\s+(.+)/);
        if (checkboxMatch) {
          const completed = checkboxMatch[1].toLowerCase() === 'x';
          tasks.push({
            id: uuidv4(),
            subject: checkboxMatch[2],
            description: '',
            activeForm: '',
            owner: '',
            status: completed ? 'completed' : 'pending',
            blocks: [],
            blockedBy: [],
            metadata: { source: 'claudemd' },
          });
          continue;
        }

        // TODO:/FIXME:/HACK: patterns
        const tagMatch = trimmed.match(/^(?:[-*]?\s*)?(TODO|FIXME|HACK):\s*(.+)/i);
        if (tagMatch) {
          tasks.push({
            id: uuidv4(),
            subject: tagMatch[2],
            description: `[${tagMatch[1].toUpperCase()}]`,
            activeForm: '',
            owner: '',
            status: 'pending',
            blocks: [],
            blockedBy: [],
            metadata: { source: 'claudemd', tag: tagMatch[1].toUpperCase() },
          });
          continue;
        }

        // Bullet items under todo/task/plan headers
        if (inTodoSection && /^[-*]\s+/.test(trimmed)) {
          const text = trimmed.replace(/^[-*]\s+/, '');
          if (text.length > 2) {
            tasks.push({
              id: uuidv4(),
              subject: text,
              description: '',
              activeForm: '',
              owner: '',
              status: 'pending',
              blocks: [],
              blockedBy: [],
              metadata: { source: 'claudemd' },
            });
          }
        }
      }

      return tasks;
    }
  );
}
