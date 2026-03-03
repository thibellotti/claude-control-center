export interface SessionMetrics {
  sessionId: string;
  projectPath: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostUSD: number;
  model: string;
  toolCounts: Record<string, number>;
  filesTouched: string[];
  filesCreated: string[];
  filesEdited: string[];
  totalLinesChanged: number;
  commandsRun: string[];
}

export interface FileHeatmapEntry {
  filePath: string;
  touchCount: number;
  editCount: number;
  lastTouched: number;
  sessions: string[];
}

export interface SessionIntelSummary {
  sessions: SessionMetrics[];
  fileHeatmap: FileHeatmapEntry[];
  totalSessions: number;
  totalCostUSD: number;
  totalDurationMs: number;
  dailyActivity: Array<{
    date: string;
    sessionCount: number;
    costUSD: number;
    filesChanged: number;
  }>;
}
