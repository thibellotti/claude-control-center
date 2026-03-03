import { ipcMain } from 'electron';
import { readdir } from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';
import { homedir } from 'os';
import { IPC_CHANNELS } from '../../shared/types';
import { estimateCost } from '../../shared/cost-utils';
import type {
  SessionMetrics,
  FileHeatmapEntry,
  SessionIntelSummary,
} from '../../shared/session-intel-types';

/**
 * Encode a project path to the Claude projects directory format.
 * /Users/thiagobellotti/Desktop/Projects/foo -> -Users-thiagobellotti-Desktop-Projects-foo
 */
function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/\//g, '-');
}

/**
 * Parse a single JSONL session file to extract deep metrics.
 */
async function parseSessionFile(
  filePath: string,
  sessionId: string,
  projectPath: string
): Promise<SessionMetrics | null> {
  const metrics: SessionMetrics = {
    sessionId,
    projectPath,
    startTime: 0,
    endTime: 0,
    durationMs: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    estimatedCostUSD: 0,
    model: 'unknown',
    toolCounts: {},
    filesTouched: [],
    filesCreated: [],
    filesEdited: [],
    totalLinesChanged: 0,
    commandsRun: [],
  };

  const touchedFiles = new Set<string>();
  const createdFiles = new Set<string>();
  const editedFiles = new Set<string>();
  const commands = new Set<string>();
  let firstTimestamp = 0;
  let lastTimestamp = 0;
  let lineCount = 0;

  try {
    const rl = createInterface({
      input: createReadStream(filePath, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }

      lineCount++;

      // Extract timestamp
      const ts = parsed.timestamp as string | undefined;
      if (ts) {
        const epoch = new Date(ts).getTime();
        if (epoch > 0) {
          if (firstTimestamp === 0 || epoch < firstTimestamp) firstTimestamp = epoch;
          if (epoch > lastTimestamp) lastTimestamp = epoch;
        }
      }

      // Extract model and usage from assistant messages
      const message = parsed.message as Record<string, unknown> | undefined;
      if (message && typeof message === 'object') {
        // Model
        const model = message.model as string | undefined;
        if (model && metrics.model === 'unknown') {
          metrics.model = model;
        }

        // Usage from message.usage
        const usage = message.usage as Record<string, number> | undefined;
        if (usage && typeof usage === 'object') {
          if (typeof usage.input_tokens === 'number') {
            metrics.totalInputTokens += usage.input_tokens;
          }
          if (typeof usage.output_tokens === 'number') {
            metrics.totalOutputTokens += usage.output_tokens;
          }
        }

        // Extract tool calls from message.content
        const content = message.content as unknown[] | undefined;
        if (Array.isArray(content)) {
          for (const block of content) {
            const b = block as Record<string, unknown>;
            if (b.type === 'tool_use') {
              const toolName = b.name as string;
              if (toolName) {
                metrics.toolCounts[toolName] =
                  (metrics.toolCounts[toolName] || 0) + 1;

                // Extract file paths and commands from tool input
                const input = b.input as Record<string, unknown> | undefined;
                if (input && typeof input === 'object') {
                  const fp = input.file_path as string;

                  if (toolName === 'Read' && fp) {
                    touchedFiles.add(fp);
                  } else if (toolName === 'Write' && fp) {
                    createdFiles.add(fp);
                    touchedFiles.add(fp);
                  } else if (toolName === 'Edit' && fp) {
                    editedFiles.add(fp);
                    touchedFiles.add(fp);
                  } else if (toolName === 'Bash') {
                    const cmd = input.command as string;
                    if (cmd) {
                      // Truncate long commands
                      commands.add(cmd.length > 120 ? cmd.slice(0, 120) + '...' : cmd);
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Also check top-level usage
      const topUsage = parsed.usage as Record<string, number> | undefined;
      if (topUsage && typeof topUsage === 'object') {
        if (typeof topUsage.input_tokens === 'number') {
          metrics.totalInputTokens += topUsage.input_tokens;
        }
        if (typeof topUsage.output_tokens === 'number') {
          metrics.totalOutputTokens += topUsage.output_tokens;
        }
      }
    }
  } catch {
    return null;
  }

  // Skip sessions with no meaningful data
  if (lineCount === 0 || (metrics.totalInputTokens === 0 && metrics.totalOutputTokens === 0)) {
    return null;
  }

  metrics.startTime = firstTimestamp;
  metrics.endTime = lastTimestamp;
  metrics.durationMs = lastTimestamp > firstTimestamp ? lastTimestamp - firstTimestamp : 0;
  metrics.estimatedCostUSD = estimateCost(
    metrics.totalInputTokens,
    metrics.totalOutputTokens,
    metrics.model
  );
  metrics.filesTouched = Array.from(touchedFiles);
  metrics.filesCreated = Array.from(createdFiles);
  metrics.filesEdited = Array.from(editedFiles);
  metrics.commandsRun = Array.from(commands);

  return metrics;
}

/**
 * Analyze all JSONL session files for a given project path.
 */
export async function analyzeSessionIntel(
  projectPath: string
): Promise<SessionIntelSummary> {
  const empty: SessionIntelSummary = {
    sessions: [],
    fileHeatmap: [],
    totalSessions: 0,
    totalCostUSD: 0,
    totalDurationMs: 0,
    dailyActivity: [],
  };

  const claudeProjectsDir = join(homedir(), '.claude', 'projects');
  if (!existsSync(claudeProjectsDir)) return empty;

  // Encode the project path to find the directory
  const encoded = encodeProjectPath(projectPath);
  const projectDir = join(claudeProjectsDir, encoded);

  if (!existsSync(projectDir)) return empty;

  let files: string[];
  try {
    files = await readdir(projectDir);
  } catch {
    return empty;
  }

  const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));
  const sessions: SessionMetrics[] = [];

  // Parse all JSONL files in parallel (batched)
  const BATCH_SIZE = 20;
  for (let i = 0; i < jsonlFiles.length; i += BATCH_SIZE) {
    const batch = jsonlFiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((f) => {
        const sessionId = f.replace('.jsonl', '');
        return parseSessionFile(join(projectDir, f), sessionId, projectPath);
      })
    );
    for (const result of results) {
      if (result) sessions.push(result);
    }
  }

  // Sort by start time descending (newest first)
  sessions.sort((a, b) => b.startTime - a.startTime);

  // Build file heatmap from all sessions
  const heatmapMap = new Map<string, FileHeatmapEntry>();
  for (const session of sessions) {
    for (const fp of session.filesTouched) {
      const existing = heatmapMap.get(fp);
      if (existing) {
        existing.touchCount++;
        if (session.filesEdited.includes(fp) || session.filesCreated.includes(fp)) {
          existing.editCount++;
        }
        if (session.startTime > existing.lastTouched) {
          existing.lastTouched = session.startTime;
        }
        if (!existing.sessions.includes(session.sessionId)) {
          existing.sessions.push(session.sessionId);
        }
      } else {
        heatmapMap.set(fp, {
          filePath: fp,
          touchCount: 1,
          editCount:
            session.filesEdited.includes(fp) || session.filesCreated.includes(fp) ? 1 : 0,
          lastTouched: session.startTime,
          sessions: [session.sessionId],
        });
      }
    }
  }

  const fileHeatmap = Array.from(heatmapMap.values()).sort(
    (a, b) => b.touchCount - a.touchCount
  );

  // Build daily activity
  const dailyMap = new Map<
    string,
    { sessionCount: number; costUSD: number; filesChanged: Set<string> }
  >();
  for (const session of sessions) {
    const date = session.startTime > 0
      ? new Date(session.startTime).toISOString().slice(0, 10)
      : new Date(session.endTime).toISOString().slice(0, 10);

    if (!date || date === '1970-01-01') continue;

    const existing = dailyMap.get(date);
    if (existing) {
      existing.sessionCount++;
      existing.costUSD += session.estimatedCostUSD;
      for (const f of [...session.filesEdited, ...session.filesCreated]) {
        existing.filesChanged.add(f);
      }
    } else {
      dailyMap.set(date, {
        sessionCount: 1,
        costUSD: session.estimatedCostUSD,
        filesChanged: new Set([...session.filesEdited, ...session.filesCreated]),
      });
    }
  }

  const dailyActivity = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      sessionCount: data.sessionCount,
      costUSD: data.costUSD,
      filesChanged: data.filesChanged.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Totals
  let totalCostUSD = 0;
  let totalDurationMs = 0;
  for (const session of sessions) {
    totalCostUSD += session.estimatedCostUSD;
    totalDurationMs += session.durationMs;
  }

  return {
    sessions,
    fileHeatmap,
    totalSessions: sessions.length,
    totalCostUSD,
    totalDurationMs,
    dailyActivity,
  };
}

/**
 * Get detail for a single session.
 */
async function getSessionDetail(
  sessionId: string,
  projectPath: string
): Promise<SessionMetrics | null> {
  const claudeProjectsDir = join(homedir(), '.claude', 'projects');
  const encoded = encodeProjectPath(projectPath);
  const filePath = join(claudeProjectsDir, encoded, `${sessionId}.jsonl`);

  if (!existsSync(filePath)) return null;

  return parseSessionFile(filePath, sessionId, projectPath);
}

export function registerSessionIntelHandlers() {
  ipcMain.handle(
    IPC_CHANNELS.SESSION_INTEL_ANALYZE,
    async (_event, opts: { projectPath: string }) => {
      return analyzeSessionIntel(opts.projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SESSION_INTEL_SESSION_DETAIL,
    async (_event, opts: { sessionId: string; projectPath: string }) => {
      return getSessionDetail(opts.sessionId, opts.projectPath);
    }
  );
}
