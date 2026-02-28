import { ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { basename, join } from 'path';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { IPC_CHANNELS } from '../../shared/types';
import type { ActiveSession } from '../../shared/types';
import { log } from '../helpers/logger';

const execAsync = promisify(exec);
const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

/**
 * Encode a filesystem path to Claude's directory name format.
 * e.g., "/Users/thiago/Projects/myapp" → "-Users-thiago-Projects-myapp"
 */
function encodePath(fsPath: string): string {
  return fsPath.replace(/\//g, '-');
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract the first user prompt from a JSONL session file.
 * Reads only the first chunk asynchronously to find a `type: "user"` entry
 * whose `message.content` is a plain string (not a tool_result array).
 */
async function extractSessionLabel(jsonlPath: string, maxBytes: number = 50000): Promise<string | null> {
  let handle: fs.FileHandle | null = null;
  try {
    handle = await fs.open(jsonlPath, 'r');
    const buf = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buf, 0, maxBytes, 0);
    await handle.close();
    handle = null;

    const text = buf.toString('utf-8', 0, bytesRead);
    const lines = text.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'user') {
          const content = obj.message?.content;
          if (typeof content === 'string' && content.trim().length > 0) {
            // Clean up: remove XML tags, trim, truncate
            let label = content.trim()
              .replace(/<[^>]+>/g, '') // strip XML/HTML tags
              .replace(/\s+/g, ' ')    // collapse whitespace
              .trim();
            if (label.length > 80) {
              label = label.slice(0, 77) + '...';
            }
            return label || null;
          }
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch (error: unknown) {
    log('warn', 'sessions', `Failed to extract session label from ${jsonlPath}`, error);
    if (handle) {
      try { await handle.close(); } catch { /* ignore */ }
    }
  }
  return null;
}

/**
 * For a given project path, find the most recently modified JSONL files
 * and extract their session labels. Returns a map of sessionId → label.
 */
async function getActiveSessionLabels(projectPath: string, maxSessions: number): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const encoded = encodePath(projectPath);

  const projectDir = join(CLAUDE_PROJECTS_DIR, encoded);
  if (!(await pathExists(projectDir))) return labels;

  try {
    const allFiles = await fs.readdir(projectDir);
    const jsonlFiles = allFiles.filter(f => f.endsWith('.jsonl'));

    // Stat all JSONL files in parallel
    const fileStats = await Promise.all(
      jsonlFiles.map(async (f) => {
        const filePath = join(projectDir, f);
        const stat = await fs.stat(filePath);
        return { name: f, path: filePath, mtime: stat.mtimeMs };
      })
    );

    fileStats.sort((a, b) => b.mtime - a.mtime);
    const recent = fileStats.slice(0, maxSessions);

    // Only consider files modified in the last 10 minutes (likely active)
    const cutoff = Date.now() - 10 * 60 * 1000;

    for (const file of recent) {
      if (file.mtime < cutoff) continue;
      const sessionId = file.name.replace('.jsonl', '');
      const label = await extractSessionLabel(file.path);
      if (label) {
        labels.set(sessionId, label);
      }
    }
  } catch (error: unknown) {
    log('warn', 'sessions', `Failed to get session labels for ${projectPath}`, error);
  }

  return labels;
}

async function detectActiveSessions(): Promise<ActiveSession[]> {
  try {
    // Find only actual "claude" CLI processes
    const { stdout } = await execAsync(
      'ps -eo pid,lstart,command | grep -E "\\bclaude\\s*$"'
    );

    const sessions: ActiveSession[] = [];
    const lines = stdout.trim().split('\n').filter(Boolean);

    // Group PIDs by project path to batch label lookups
    const pidsByProject = new Map<string, { pid: number; line: string }[]>();

    for (const line of lines) {
      const pidMatch = line.match(/^\s*(\d+)/);
      if (!pidMatch) continue;
      const pid = parseInt(pidMatch[1], 10);

      let projectPath = '';
      try {
        const { stdout: cwdOut } = await execAsync(
          `lsof -a -p ${pid} -d cwd -Fn 2>/dev/null | grep '^n' | head -1`
        );
        const cwdMatch = cwdOut.match(/^n(.+)$/m);
        if (cwdMatch) {
          projectPath = cwdMatch[1];
        }
      } catch {
        // Process may have exited
      }

      if (projectPath) {
        if (!pidsByProject.has(projectPath)) {
          pidsByProject.set(projectPath, []);
        }
        pidsByProject.get(projectPath)!.push({ pid, line: line.trim() });
      }
    }

    // For each project, get labels from JSONL files
    for (const [projectPath, pids] of Array.from(pidsByProject.entries())) {
      const labels = await getActiveSessionLabels(projectPath, pids.length + 2);
      const labelValues = Array.from(labels.values());

      for (let i = 0; i < pids.length; i++) {
        const { pid, line } = pids[i];
        // Best-effort label assignment: match by index (newest JSONL = newest PID)
        const sessionLabel = labelValues[i] || null;

        sessions.push({
          pid,
          projectPath,
          projectName: basename(projectPath),
          startTime: Date.now(),
          command: line,
          sessionLabel,
        });
      }
    }

    return sessions;
  } catch (error: unknown) {
    log('warn', 'sessions', 'Failed to detect active sessions', error);
    return [];
  }
}

export function registerSessionHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_ACTIVE_SESSIONS, async () => {
    return detectActiveSessions();
  });
}
