import { ipcMain } from 'electron';
import { readdir, readFile, stat } from 'fs/promises';
import { join, basename } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { IPC_CHANNELS } from '../../shared/types';
import type { UsageEntry, UsageSummary } from '../../shared/types';
import { decodeClaudePath } from '../helpers/decode-path';

// Claude Sonnet 4 pricing (USD per million tokens)
const INPUT_COST_PER_MILLION = 3;
const OUTPUT_COST_PER_MILLION = 15;

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION +
    (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION
  );
}

function getDateString(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toISOString().slice(0, 10);
}

interface ParsedUsage {
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  sessionCount: number;
}

/**
 * Parse a single JSONL file for usage data.
 * Looks for lines with costUSD, usage objects, or top-level token counts.
 */
async function parseJsonlFile(filePath: string): Promise<ParsedUsage> {
  const result: ParsedUsage = {
    inputTokens: 0,
    outputTokens: 0,
    costUSD: 0,
    sessionCount: 1,
  };

  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return result;
  }

  const lines = content.split('\n').filter((l) => l.trim());
  let hasCostField = false;

  for (const line of lines) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    // Case a) Lines with "costUSD" field — use directly
    if (typeof parsed.costUSD === 'number') {
      result.costUSD += parsed.costUSD;
      hasCostField = true;
    }

    // Case b) Lines with top-level inputTokens/outputTokens
    if (typeof parsed.inputTokens === 'number') {
      result.inputTokens += parsed.inputTokens;
    }
    if (typeof parsed.outputTokens === 'number') {
      result.outputTokens += parsed.outputTokens;
    }

    // Case c) Lines with message.usage.input_tokens/output_tokens
    const message = parsed.message as Record<string, unknown> | undefined;
    if (message && typeof message === 'object') {
      const usage = message.usage as Record<string, unknown> | undefined;
      if (usage && typeof usage === 'object') {
        if (typeof usage.input_tokens === 'number') {
          result.inputTokens += usage.input_tokens;
        }
        if (typeof usage.output_tokens === 'number') {
          result.outputTokens += usage.output_tokens;
        }
      }
    }

    // Case d) Top-level usage object
    const topUsage = parsed.usage as Record<string, unknown> | undefined;
    if (topUsage && typeof topUsage === 'object') {
      if (typeof topUsage.input_tokens === 'number') {
        result.inputTokens += topUsage.input_tokens;
      }
      if (typeof topUsage.output_tokens === 'number') {
        result.outputTokens += topUsage.output_tokens;
      }
    }
  }

  // If no direct costUSD was found, estimate from tokens
  if (!hasCostField && (result.inputTokens > 0 || result.outputTokens > 0)) {
    result.costUSD = estimateCost(result.inputTokens, result.outputTokens);
  }

  return result;
}

async function getUsageStats(days: number): Promise<UsageSummary> {
  const claudeProjectsDir = join(homedir(), '.claude', 'projects');

  if (!existsSync(claudeProjectsDir)) {
    return {
      entries: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUSD: 0,
      totalSessions: 0,
    };
  }

  const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;

  // Map: "YYYY-MM-DD|projectPath" -> UsageEntry
  const entryMap = new Map<string, UsageEntry>();

  let projectDirs: string[];
  try {
    projectDirs = await readdir(claudeProjectsDir);
  } catch {
    return {
      entries: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUSD: 0,
      totalSessions: 0,
    };
  }

  for (const encodedDir of projectDirs) {
    const projectDir = join(claudeProjectsDir, encodedDir);

    let dirStat;
    try {
      dirStat = await stat(projectDir);
    } catch {
      continue;
    }
    if (!dirStat.isDirectory()) continue;

    // Decode the project path from the encoded directory name
    const decodedPath = await decodeClaudePath(encodedDir);
    const projectName = basename(decodedPath);

    // List JSONL files in this project directory
    let files: string[];
    try {
      files = await readdir(projectDir);
    } catch {
      continue;
    }

    const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

    for (const jsonlFile of jsonlFiles) {
      const filePath = join(projectDir, jsonlFile);

      // Check modification time
      let fileStat;
      try {
        fileStat = await stat(filePath);
      } catch {
        continue;
      }

      if (fileStat.mtimeMs < cutoffDate) continue;

      const dateStr = getDateString(fileStat.mtimeMs);
      const usage = await parseJsonlFile(filePath);

      // Skip files with no usage data at all
      if (
        usage.inputTokens === 0 &&
        usage.outputTokens === 0 &&
        usage.costUSD === 0
      ) {
        continue;
      }

      const key = `${dateStr}|${decodedPath}`;
      const existing = entryMap.get(key);

      if (existing) {
        existing.inputTokens += usage.inputTokens;
        existing.outputTokens += usage.outputTokens;
        existing.totalTokens += usage.inputTokens + usage.outputTokens;
        existing.estimatedCostUSD += usage.costUSD;
        existing.sessionCount += usage.sessionCount;
      } else {
        entryMap.set(key, {
          date: dateStr,
          projectPath: decodedPath,
          projectName,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.inputTokens + usage.outputTokens,
          estimatedCostUSD: usage.costUSD,
          sessionCount: usage.sessionCount,
        });
      }
    }
  }

  const entries = Array.from(entryMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUSD = 0;
  let totalSessions = 0;

  for (const entry of entries) {
    totalInputTokens += entry.inputTokens;
    totalOutputTokens += entry.outputTokens;
    totalCostUSD += entry.estimatedCostUSD;
    totalSessions += entry.sessionCount;
  }

  return {
    entries,
    totalInputTokens,
    totalOutputTokens,
    totalCostUSD,
    totalSessions,
  };
}

export function registerUsageHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_USAGE_STATS, async (_event, days: number) => {
    return getUsageStats(days || 30);
  });
}
