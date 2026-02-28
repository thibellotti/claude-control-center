import { ipcMain, BrowserWindow } from 'electron';
import { watch, promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { IPC_CHANNELS } from '../../shared/types';
import { log } from '../helpers/logger';

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

interface FeedEntry {
  timestamp: number;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system';
  summary: string;
  projectPath: string;
  sessionId: string;
}

// Track file watchers and file positions
const watchers = new Map<string, ReturnType<typeof watch>>();
const filePositions = new Map<string, number>();
let feedActive = false;
let rescanInterval: ReturnType<typeof setInterval> | null = null;

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

function decodePath(encoded: string): string {
  // Reverse of encodePath: "-Users-thiago-..." → "/Users/thiago/..."
  return encoded.replace(/^-/, '/').replace(/-/g, '/');
}

function summarizeLine(obj: Record<string, unknown>): FeedEntry | null {
  try {
    const timestamp = typeof obj.timestamp === 'string'
      ? new Date(obj.timestamp).getTime()
      : Date.now();

    if (obj.type === 'user') {
      const content = (obj as { message?: { content?: unknown } }).message?.content;
      if (typeof content === 'string') {
        const clean = content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (clean.length > 0) {
          return {
            timestamp,
            type: 'user',
            summary: clean.length > 120 ? clean.slice(0, 117) + '...' : clean,
            projectPath: '',
            sessionId: '',
          };
        }
      }
    }

    if (obj.type === 'assistant') {
      const content = (obj as { message?: { content?: unknown[] } }).message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          const b = block as Record<string, unknown>;
          if (b.type === 'tool_use') {
            const name = b.name as string || 'tool';
            const input = b.input as Record<string, unknown> | undefined;
            let detail = '';
            if (name === 'Edit' || name === 'Read' || name === 'Write') {
              detail = (input?.file_path as string)?.split('/').pop() || '';
            } else if (name === 'Bash') {
              const cmd = (input?.command as string || '').slice(0, 60);
              detail = cmd;
            } else if (name === 'Glob' || name === 'Grep') {
              detail = (input?.pattern as string) || '';
            }
            return {
              timestamp,
              type: 'tool_use',
              summary: detail ? `${name}: ${detail}` : name,
              projectPath: '',
              sessionId: '',
            };
          }
          if (b.type === 'text' && typeof b.text === 'string') {
            const text = (b.text as string).replace(/\s+/g, ' ').trim();
            if (text.length > 0) {
              return {
                timestamp,
                type: 'assistant',
                summary: text.length > 120 ? text.slice(0, 117) + '...' : text,
                projectPath: '',
                sessionId: '',
              };
            }
          }
        }
      }
    }
  } catch (error: unknown) {
    log('warn', 'live-feed', 'Failed to summarize line from JSONL entry', error);
  }
  return null;
}

async function processNewLines(filePath: string, projectPath: string, sessionId: string) {
  const win = getMainWindow();
  if (!win || win.isDestroyed()) return;

  let handle: fs.FileHandle | null = null;
  try {
    const stat = await fs.stat(filePath);
    const prevPos = filePositions.get(filePath) || 0;
    if (stat.size <= prevPos) return;

    // Read new bytes
    const bytesToRead = Math.min(stat.size - prevPos, 50000);
    const buf = Buffer.alloc(bytesToRead);
    handle = await fs.open(filePath, 'r');
    await handle.read(buf, 0, bytesToRead, prevPos);

    filePositions.set(filePath, prevPos + bytesToRead);

    const text = buf.toString('utf-8');
    const lines = text.split('\n').filter(Boolean);

    const entries: FeedEntry[] = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        const entry = summarizeLine(obj);
        if (entry) {
          entry.projectPath = projectPath;
          entry.sessionId = sessionId;
          entries.push(entry);
        }
      } catch (error: unknown) {
        log('warn', 'live-feed', 'Failed to parse JSONL line', error);
      }
    }

    if (entries.length > 0) {
      win.webContents.send(IPC_CHANNELS.LIVE_FEED_DATA, entries);
    }
  } catch (error: unknown) {
    log('warn', 'live-feed', `Failed to process new lines from ${filePath}`, error);
  } finally {
    if (handle) {
      try {
        await handle.close();
      } catch (error: unknown) {
        log('warn', 'live-feed', `Failed to close file handle for ${filePath}`, error);
      }
    }
  }
}

async function startWatching() {
  try {
    await fs.access(CLAUDE_PROJECTS_DIR);
  } catch {
    return;
  }

  // Find recently modified JSONL files (last 30 min)
  const cutoff = Date.now() - 30 * 60 * 1000;

  try {
    const projectDirs = await fs.readdir(CLAUDE_PROJECTS_DIR);
    for (const dir of projectDirs) {
      const projectDir = join(CLAUDE_PROJECTS_DIR, dir);
      try {
        const dirStat = await fs.stat(projectDir);
        if (!dirStat.isDirectory()) continue;
      } catch (error: unknown) {
        log('warn', 'live-feed', `Failed to stat project directory ${projectDir}`, error);
        continue;
      }

      const projectPath = decodePath(dir);

      try {
        const dirEntries = await fs.readdir(projectDir);
        const jsonlFiles = dirEntries.filter((f) => f.endsWith('.jsonl'));

        const filesWithMtime: { name: string; path: string; mtime: number }[] = [];
        for (const f of jsonlFiles) {
          const fullPath = join(projectDir, f);
          try {
            const fileStat = await fs.stat(fullPath);
            filesWithMtime.push({
              name: f,
              path: fullPath,
              mtime: fileStat.mtimeMs,
            });
          } catch (error: unknown) {
            log('warn', 'live-feed', `Failed to stat JSONL file ${fullPath}`, error);
          }
        }

        const files = filesWithMtime
          .filter((f) => f.mtime > cutoff)
          .sort((a, b) => b.mtime - a.mtime)
          .slice(0, 3);

        for (const file of files) {
          if (watchers.has(file.path)) continue;

          // Start at end of file (only show new activity)
          try {
            const fileStat = await fs.stat(file.path);
            filePositions.set(file.path, fileStat.size);
          } catch (error: unknown) {
            log('warn', 'live-feed', `Failed to stat file for initial position ${file.path}`, error);
            continue;
          }

          const sessionId = file.name.replace('.jsonl', '');

          const watcher = watch(file.path, () => {
            processNewLines(file.path, projectPath, sessionId);
          });

          watchers.set(file.path, watcher);
        }
      } catch (error: unknown) {
        log('warn', 'live-feed', `Failed to scan project directory ${projectDir}`, error);
      }
    }
  } catch (error: unknown) {
    log('warn', 'live-feed', 'Failed to read projects directory', error);
  }
}

function stopWatching() {
  if (rescanInterval) {
    clearInterval(rescanInterval);
    rescanInterval = null;
  }
  Array.from(watchers.entries()).forEach(([path, watcher]) => {
    watcher.close();
    watchers.delete(path);
  });
  filePositions.clear();
  feedActive = false;
}

export function registerLiveFeedHandlers() {
  ipcMain.handle(IPC_CHANNELS.LIVE_FEED_START, async () => {
    if (feedActive) return true;
    feedActive = true;
    await startWatching();

    // Clear any previous interval before creating a new one
    if (rescanInterval) clearInterval(rescanInterval);

    // Re-scan for new files every 30 seconds
    rescanInterval = setInterval(() => {
      if (!feedActive) {
        if (rescanInterval) clearInterval(rescanInterval);
        rescanInterval = null;
        return;
      }
      startWatching();
    }, 30000);

    return true;
  });

  ipcMain.handle(IPC_CHANNELS.LIVE_FEED_STOP, async () => {
    stopWatching();
    return true;
  });
}

export function cleanupLiveFeed() {
  stopWatching();
}
