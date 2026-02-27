import { ipcMain } from 'electron';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { IPC_CHANNELS, ClaudeSettings, SessionEntry } from '../../shared/types';

const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, '.claude');
const SETTINGS_PATH = path.join(CLAUDE_DIR, 'settings.json');
const HISTORY_PATH = path.join(CLAUDE_DIR, 'history.jsonl');

export function registerSettingsHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_CLAUDE_SETTINGS, async () => {
    return getClaudeSettings();
  });

  ipcMain.handle(IPC_CHANNELS.GET_SESSIONS, async (_, projectPath?: string) => {
    return getSessions(projectPath);
  });
}

function getClaudeSettings(): ClaudeSettings | null {
  try {
    if (!existsSync(SETTINGS_PATH)) return null;

    const content = readFileSync(SETTINGS_PATH, 'utf-8');
    const parsed = JSON.parse(content);

    return {
      permissions: {
        allow: parsed?.permissions?.allow || [],
      },
      env: parsed?.env || {},
      enabledPlugins: parsed?.enabledPlugins || {},
    };
  } catch {
    return null;
  }
}

function getSessions(projectPath?: string): SessionEntry[] {
  const sessions: SessionEntry[] = [];

  try {
    if (!existsSync(HISTORY_PATH)) return sessions;

    const content = readFileSync(HISTORY_PATH, 'utf-8');
    const lines = content.trim().split('\n');

    // Parse last 200 entries (from the end)
    const startIdx = Math.max(0, lines.length - 200);
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === 'object') {
          const entry: SessionEntry = {
            display: parsed.display || parsed.title || '',
            timestamp: parsed.timestamp || 0,
            project: parsed.project || parsed.cwd || '',
            sessionId: parsed.sessionId || parsed.id || '',
          };

          // Filter by projectPath if provided
          if (projectPath) {
            if (!entry.project.startsWith(projectPath)) continue;
          }

          sessions.push(entry);
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // Skip silently
  }

  // Sort newest first
  sessions.sort((a, b) => b.timestamp - a.timestamp);

  return sessions;
}
