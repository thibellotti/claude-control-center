import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { IPC_CHANNELS } from '../../shared/types';
import { log } from '../helpers/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionUsage {
  inputTokens: number;
  outputTokens: number;
  model: string;
  timestamp: number;
}

interface DailyBucket {
  date: string;
  costUSD: number;
  inputTokens: number;
  outputTokens: number;
  sessionCount: number;
}

interface ProjectUsage {
  projectPath: string;
  projectName: string;
  clientName: string | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  sessionCount: number;
  dailyData: DailyBucket[];
}

interface ClientUsage {
  clientName: string;
  projects: ProjectUsage[];
  totalCostUSD: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalSessions: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

/**
 * Encode a filesystem path to Claude's directory name format.
 * e.g., "/Users/thiago/Projects/myapp" -> "-Users-thiago-Projects-myapp"
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
 * Estimate cost based on model pricing (per million tokens).
 */
function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  if (model.includes('opus')) return (inputTokens * 15 + outputTokens * 75) / 1_000_000;
  if (model.includes('haiku')) return (inputTokens * 0.25 + outputTokens * 1.25) / 1_000_000;
  // Default to Sonnet pricing
  return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
}

/**
 * Parse a single JSONL file and extract usage entries.
 */
async function parseJSONLFile(filePath: string, cutoffMs: number): Promise<SessionUsage[]> {
  const usages: SessionUsage[] = [];

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'assistant' && obj.usage) {
          const inputTokens = obj.usage.input_tokens || 0;
          const outputTokens = obj.usage.output_tokens || 0;
          const model = obj.model || '';
          const timestamp = obj.timestamp
            ? new Date(obj.timestamp).getTime()
            : 0;

          // Skip entries outside date range
          if (timestamp > 0 && timestamp < cutoffMs) continue;

          usages.push({ inputTokens, outputTokens, model, timestamp });
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch (error: unknown) {
    log('warn', 'analytics', `Failed to parse JSONL file: ${filePath}`, error);
  }

  return usages;
}

/**
 * Aggregate usage data for a single project.
 */
async function getProjectUsage(
  projectPath: string,
  projectName: string,
  clientName: string | null,
  cutoffMs: number,
): Promise<ProjectUsage> {
  const encoded = encodePath(projectPath);
  const projectDir = join(CLAUDE_PROJECTS_DIR, encoded);

  const result: ProjectUsage = {
    projectPath,
    projectName,
    clientName,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUSD: 0,
    sessionCount: 0,
    dailyData: [],
  };

  if (!(await pathExists(projectDir))) return result;

  try {
    const allFiles = await fs.readdir(projectDir);
    const jsonlFiles = allFiles.filter((f) => f.endsWith('.jsonl'));

    // Daily buckets: date string -> bucket
    const dailyMap = new Map<string, DailyBucket>();

    for (const fileName of jsonlFiles) {
      const filePath = join(projectDir, fileName);

      // Check file modification time — skip old files quickly
      const stat = await fs.stat(filePath);
      if (stat.mtimeMs < cutoffMs) continue;

      const usages = await parseJSONLFile(filePath, cutoffMs);
      if (usages.length === 0) continue;

      // Count this as a session
      result.sessionCount++;

      for (const usage of usages) {
        const cost = estimateCost(usage.inputTokens, usage.outputTokens, usage.model);

        result.totalInputTokens += usage.inputTokens;
        result.totalOutputTokens += usage.outputTokens;
        result.totalCostUSD += cost;

        // Bucket by day
        const dateStr = usage.timestamp > 0
          ? new Date(usage.timestamp).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);

        let bucket = dailyMap.get(dateStr);
        if (!bucket) {
          bucket = { date: dateStr, costUSD: 0, inputTokens: 0, outputTokens: 0, sessionCount: 0 };
          dailyMap.set(dateStr, bucket);
        }
        bucket.costUSD += cost;
        bucket.inputTokens += usage.inputTokens;
        bucket.outputTokens += usage.outputTokens;
      }

      // Count session in its first usage day
      if (usages.length > 0) {
        const firstUsage = usages[0];
        const dateStr = firstUsage.timestamp > 0
          ? new Date(firstUsage.timestamp).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);
        const bucket = dailyMap.get(dateStr);
        if (bucket) bucket.sessionCount++;
      }
    }

    // Sort daily data chronologically
    result.dailyData = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  } catch (error: unknown) {
    log('warn', 'analytics', `Failed to read project dir: ${projectDir}`, error);
  }

  return result;
}

// ---------------------------------------------------------------------------
// IPC Handler
// ---------------------------------------------------------------------------

export function registerAnalyticsHandlers() {
  ipcMain.handle(
    IPC_CHANNELS.GET_ANALYTICS,
    async (
      _,
      opts: {
        projects: { path: string; name: string; client?: string | null }[];
        days: number;
      },
    ) => {
      const { projects, days } = opts;
      const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;

      // Gather usage for all projects in parallel
      const projectUsages = await Promise.all(
        projects.map((p) =>
          getProjectUsage(p.path, p.name, p.client ?? null, cutoffMs),
        ),
      );

      // Group by client name
      const clientMap = new Map<string, ProjectUsage[]>();

      for (const pu of projectUsages) {
        const key = pu.clientName || 'Unassigned';
        if (!clientMap.has(key)) clientMap.set(key, []);
        clientMap.get(key)!.push(pu);
      }

      // Build ClientUsage array
      const result: ClientUsage[] = [];
      for (const [clientName, projectList] of clientMap.entries()) {
        const cu: ClientUsage = {
          clientName,
          projects: projectList,
          totalCostUSD: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalSessions: 0,
        };

        for (const p of projectList) {
          cu.totalCostUSD += p.totalCostUSD;
          cu.totalInputTokens += p.totalInputTokens;
          cu.totalOutputTokens += p.totalOutputTokens;
          cu.totalSessions += p.sessionCount;
        }

        result.push(cu);
      }

      // Sort by cost descending
      result.sort((a, b) => b.totalCostUSD - a.totalCostUSD);

      return result;
    },
  );
}
