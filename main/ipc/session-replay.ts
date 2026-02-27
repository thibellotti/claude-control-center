import { ipcMain } from 'electron';
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { IPC_CHANNELS } from '../../shared/types';
import type { SessionTimeline, SessionAction } from '../../shared/types';

const HOME = os.homedir();
const CLAUDE_PROJECTS_DIR = path.join(HOME, '.claude', 'projects');

// Maximum number of actions to return per session to avoid memory issues
const MAX_ACTIONS_PER_SESSION = 500;

/**
 * Encode a project path to Claude's directory format.
 * Replaces '/' with '-', e.g. /Users/thiago/Projects/myapp -> -Users-thiago-Projects-myapp
 */
function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/\//g, '-');
}

/**
 * Read the first and last lines of a file efficiently.
 * For large files, we only read small chunks from the beginning and end.
 */
function readFirstAndLastLines(filePath: string): { first: string | null; last: string | null } {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);

    if (lines.length === 0) return { first: null, last: null };

    return {
      first: lines[0],
      last: lines[lines.length - 1],
    };
  } catch {
    return { first: null, last: null };
  }
}

/**
 * Safely parse a JSON string, returning null on failure.
 */
function safeParseJSON(str: string): Record<string, unknown> | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Extract timestamp from a JSONL entry.
 */
function extractTimestamp(entry: Record<string, unknown>): string | null {
  if (typeof entry.timestamp === 'string') return entry.timestamp;

  // Some entries might have the timestamp nested in message
  const message = entry.message as Record<string, unknown> | undefined;
  if (message && typeof message.timestamp === 'string') return message.timestamp;

  return null;
}

/**
 * Extract actions from a parsed JSONL entry.
 */
function extractActions(
  entry: Record<string, unknown>,
  lineIndex: number
): SessionAction[] {
  const actions: SessionAction[] = [];
  const entryType = entry.type as string | undefined;
  const timestamp = extractTimestamp(entry) || new Date().toISOString();

  // Only process assistant messages for tool_use blocks
  if (entryType !== 'assistant') return actions;

  const message = entry.message as Record<string, unknown> | undefined;
  if (!message) return actions;

  const content = message.content;
  if (!Array.isArray(content)) return actions;

  for (const block of content) {
    if (typeof block !== 'object' || block === null) continue;

    const blockType = (block as Record<string, unknown>).type as string;

    if (blockType === 'tool_use') {
      const toolName = (block as Record<string, unknown>).name as string;
      const input = (block as Record<string, unknown>).input as Record<string, unknown> | undefined;
      const toolId = (block as Record<string, unknown>).id as string | undefined;
      const actionId = toolId || `${lineIndex}-${actions.length}`;

      if (!input) continue;

      switch (toolName) {
        case 'Read': {
          const filePath = input.file_path as string;
          actions.push({
            id: actionId,
            timestamp,
            type: 'file_read',
            description: `Read ${shortenFilePath(filePath)}`,
            filePath: filePath,
          });
          break;
        }
        case 'Write': {
          const filePath = input.file_path as string;
          actions.push({
            id: actionId,
            timestamp,
            type: 'file_write',
            description: `Created ${shortenFilePath(filePath)}`,
            filePath: filePath,
          });
          break;
        }
        case 'Edit': {
          const filePath = input.file_path as string;
          const oldStr = input.old_string as string | undefined;
          const newStr = input.new_string as string | undefined;
          let detail: string | undefined;

          if (oldStr && newStr) {
            const oldPreview = truncate(oldStr, 80);
            const newPreview = truncate(newStr, 80);
            detail = `- ${oldPreview}\n+ ${newPreview}`;
          }

          actions.push({
            id: actionId,
            timestamp,
            type: 'file_edit',
            description: `Edited ${shortenFilePath(filePath)}`,
            filePath: filePath,
            detail,
          });
          break;
        }
        case 'Bash': {
          const command = input.command as string;
          actions.push({
            id: actionId,
            timestamp,
            type: 'command',
            description: 'Ran command',
            detail: truncate(command, 200),
          });
          break;
        }
        case 'Grep':
        case 'Glob': {
          const pattern = (input.pattern as string) || '';
          actions.push({
            id: actionId,
            timestamp,
            type: 'file_read',
            description: `${toolName} search: ${truncate(pattern, 60)}`,
          });
          break;
        }
        case 'NotebookEdit': {
          const nbPath = input.notebook_path as string;
          actions.push({
            id: actionId,
            timestamp,
            type: 'file_edit',
            description: `Edited notebook ${shortenFilePath(nbPath || '')}`,
            filePath: nbPath,
          });
          break;
        }
        default: {
          // Other tool calls — record them generically
          actions.push({
            id: actionId,
            timestamp,
            type: 'command',
            description: `Tool: ${toolName}`,
            detail: JSON.stringify(input).slice(0, 150),
          });
          break;
        }
      }
    } else if (blockType === 'text') {
      const text = (block as Record<string, unknown>).text as string;
      if (text && text.trim().length > 0) {
        actions.push({
          id: `${lineIndex}-text-${actions.length}`,
          timestamp,
          type: 'text',
          description: truncate(text.trim(), 120),
        });
      }
    }
  }

  return actions;
}

/**
 * Shorten a file path for display, replacing home directory with ~.
 */
function shortenFilePath(filePath: string): string {
  if (!filePath) return '';
  if (filePath.startsWith(HOME)) {
    return '~' + filePath.slice(HOME.length);
  }
  // If it's very long, show only the last 3 segments
  const parts = filePath.split('/');
  if (parts.length > 4) {
    return '.../' + parts.slice(-3).join('/');
  }
  return filePath;
}

/**
 * Truncate text to a maximum length.
 */
function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  // Replace newlines with spaces for compact display
  const clean = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength) + '...';
}

export function registerSessionReplayHandlers() {
  // List all session timelines for a project (metadata only, no full actions)
  ipcMain.handle(
    IPC_CHANNELS.GET_SESSION_TIMELINES,
    async (_, projectPath: string): Promise<SessionTimeline[]> => {
      try {
        const encoded = encodeProjectPath(projectPath);
        const projectDir = path.join(CLAUDE_PROJECTS_DIR, encoded);

        if (!existsSync(projectDir)) {
          return [];
        }

        // List all .jsonl files
        const files = readdirSync(projectDir)
          .filter((f) => f.endsWith('.jsonl'))
          .map((f) => {
            const fullPath = path.join(projectDir, f);
            const stat = statSync(fullPath);
            return { name: f, fullPath, mtime: stat.mtimeMs, size: stat.size };
          })
          .sort((a, b) => b.mtime - a.mtime); // newest first

        const timelines: SessionTimeline[] = [];

        for (const file of files) {
          const { first, last } = readFirstAndLastLines(file.fullPath);
          if (!first) continue;

          const firstEntry = safeParseJSON(first);
          const lastEntry = last ? safeParseJSON(last) : null;

          const startTime =
            firstEntry ? extractTimestamp(firstEntry) : null;
          const endTime =
            lastEntry ? extractTimestamp(lastEntry) : startTime;

          // Count lines (rough action count)
          let lineCount = 0;
          try {
            const content = readFileSync(file.fullPath, 'utf-8');
            lineCount = content.split('\n').filter((l) => l.trim().length > 0).length;
          } catch {
            lineCount = 0;
          }

          // Extract session ID from filename (remove .jsonl extension)
          const sessionId = file.name.replace('.jsonl', '');

          timelines.push({
            sessionId,
            fileName: file.name,
            startTime: startTime || new Date(file.mtime).toISOString(),
            endTime: endTime || new Date(file.mtime).toISOString(),
            actionCount: lineCount,
            actions: [], // Actions not loaded in list view
          });
        }

        return timelines;
      } catch (err) {
        console.error('Failed to get session timelines:', err);
        return [];
      }
    }
  );

  // Load full timeline detail for a specific session
  ipcMain.handle(
    IPC_CHANNELS.GET_SESSION_TIMELINE_DETAIL,
    async (
      _,
      projectPath: string,
      fileName: string
    ): Promise<SessionTimeline | null> => {
      try {
        const encoded = encodeProjectPath(projectPath);
        const filePath = path.join(CLAUDE_PROJECTS_DIR, encoded, fileName);

        if (!existsSync(filePath)) {
          return null;
        }

        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim().length > 0);

        const allActions: SessionAction[] = [];
        let startTime: string | null = null;
        let endTime: string | null = null;

        for (let i = 0; i < lines.length; i++) {
          const entry = safeParseJSON(lines[i]);
          if (!entry) continue;

          const ts = extractTimestamp(entry);
          if (ts) {
            if (!startTime) startTime = ts;
            endTime = ts;
          }

          const actions = extractActions(entry, i);
          allActions.push(...actions);

          // Limit to avoid memory issues
          if (allActions.length >= MAX_ACTIONS_PER_SESSION) break;
        }

        // Trim to max
        const trimmedActions = allActions.slice(0, MAX_ACTIONS_PER_SESSION);

        const sessionId = fileName.replace('.jsonl', '');

        return {
          sessionId,
          fileName,
          startTime: startTime || new Date().toISOString(),
          endTime: endTime || startTime || new Date().toISOString(),
          actionCount: trimmedActions.length,
          actions: trimmedActions,
        };
      } catch (err) {
        console.error('Failed to load session timeline detail:', err);
        return null;
      }
    }
  );
}
