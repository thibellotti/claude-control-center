import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { IPC_CHANNELS } from '../../shared/types';
import type { SessionHistoryEntry, SessionSearchResult } from '../../shared/types';
import { log } from '../helpers/logger';

const HISTORY_DIR = join(homedir(), '.forma', 'session-history');
const INDEX_FILE = join(HISTORY_DIR, 'index.json');

// Regex to strip ANSI escape codes
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

async function ensureDir() {
  await fs.mkdir(HISTORY_DIR, { recursive: true });
}

async function readIndex(): Promise<SessionHistoryEntry[]> {
  try {
    const data = await fs.readFile(INDEX_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeIndex(entries: SessionHistoryEntry[]): Promise<void> {
  await fs.writeFile(INDEX_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

/**
 * Save session output to disk. Can be called directly (not just via IPC).
 */
export async function saveSessionOutput(opts: {
  sessionId: string;
  projectPath: string;
  projectName: string;
  command?: string;
  output: string;
}): Promise<void> {
  try {
    await ensureDir();

    const cleanOutput = opts.output.replace(ANSI_REGEX, '');
    const outputFile = join(HISTORY_DIR, `${opts.sessionId}.txt`);

    await fs.writeFile(outputFile, cleanOutput, 'utf-8');

    const index = await readIndex();

    // Update existing or add new entry
    const existing = index.findIndex((e) => e.sessionId === opts.sessionId);
    const entry: SessionHistoryEntry = {
      sessionId: opts.sessionId,
      projectPath: opts.projectPath,
      projectName: opts.projectName,
      command: opts.command,
      startTime: existing >= 0 ? index[existing].startTime : Date.now(),
      endTime: Date.now(),
      outputFile,
    };

    if (existing >= 0) {
      index[existing] = entry;
    } else {
      index.push(entry);
    }

    // Cap index at 500 entries
    if (index.length > 500) {
      const removed = index.splice(0, index.length - 500);
      // Clean up old files
      for (const old of removed) {
        try {
          await fs.unlink(old.outputFile);
        } catch {
          // File may already be gone
        }
      }
    }

    await writeIndex(index);
    log('info', 'session-history', `Saved session output for ${opts.sessionId}`);
  } catch (err) {
    log('error', 'session-history', `Failed to save session output: ${err}`);
  }
}

export function registerSessionHistoryHandlers() {
  // Save session output
  ipcMain.handle(
    IPC_CHANNELS.SAVE_SESSION_OUTPUT,
    async (
      _event,
      opts: {
        sessionId: string;
        projectPath: string;
        projectName: string;
        command?: string;
        output: string;
      }
    ) => {
      await saveSessionOutput(opts);
      return true;
    }
  );

  // Search sessions
  ipcMain.handle(
    IPC_CHANNELS.SEARCH_SESSIONS,
    async (
      _event,
      opts: { query: string; isRegex?: boolean; projectPath?: string }
    ) => {
      try {
        await ensureDir();
        const index = await readIndex();

        // Filter by project if specified
        let entries = index;
        if (opts.projectPath) {
          entries = entries.filter((e) => e.projectPath === opts.projectPath);
        }

        // Sort by most recent first
        entries.sort((a, b) => (b.endTime || b.startTime) - (a.endTime || a.startTime));

        let pattern: RegExp;
        try {
          pattern = opts.isRegex
            ? new RegExp(opts.query, 'gi')
            : new RegExp(opts.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        } catch {
          return [];
        }

        const results: SessionSearchResult[] = [];
        let totalMatchCount = 0;
        const MAX_TOTAL_MATCHES = 100;

        for (const entry of entries) {
          if (totalMatchCount >= MAX_TOTAL_MATCHES) break;

          let content: string;
          try {
            content = await fs.readFile(entry.outputFile, 'utf-8');
          } catch {
            continue;
          }

          const lines = content.split('\n');
          const matches: SessionSearchResult['matches'] = [];

          for (let i = 0; i < lines.length; i++) {
            if (totalMatchCount >= MAX_TOTAL_MATCHES) break;

            pattern.lastIndex = 0;
            if (pattern.test(lines[i])) {
              // Gather 2 lines of context above/below
              const contextStart = Math.max(0, i - 2);
              const contextEnd = Math.min(lines.length - 1, i + 2);
              const context: string[] = [];
              for (let j = contextStart; j <= contextEnd; j++) {
                if (j !== i) context.push(lines[j]);
              }

              matches.push({
                lineNumber: i + 1,
                content: lines[i],
                context,
              });
              totalMatchCount++;
            }
          }

          if (matches.length > 0) {
            results.push({
              sessionId: entry.sessionId,
              projectName: entry.projectName,
              command: entry.command,
              timestamp: entry.endTime || entry.startTime,
              matches,
              totalMatches: matches.length,
            });
          }
        }

        return results;
      } catch (err) {
        log('error', 'session-history', `Search failed: ${err}`);
        return [];
      }
    }
  );

  // Get session history
  ipcMain.handle(
    IPC_CHANNELS.GET_SESSION_HISTORY,
    async (_event, opts?: { projectPath?: string; limit?: number }) => {
      try {
        await ensureDir();
        let entries = await readIndex();

        if (opts?.projectPath) {
          entries = entries.filter((e) => e.projectPath === opts.projectPath);
        }

        // Sort by most recent first
        entries.sort((a, b) => (b.endTime || b.startTime) - (a.endTime || a.startTime));

        if (opts?.limit) {
          entries = entries.slice(0, opts.limit);
        }

        return entries;
      } catch (err) {
        log('error', 'session-history', `Failed to get history: ${err}`);
        return [];
      }
    }
  );
}
