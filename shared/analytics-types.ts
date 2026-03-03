// ---------------------------------------------------------------------------
// Analytics types — shared between main and renderer
// ---------------------------------------------------------------------------

export interface DailyBucket {
  date: string;
  costUSD: number;
  inputTokens: number;
  outputTokens: number;
  sessionCount: number;
}

export interface ProjectUsage {
  projectPath: string;
  projectName: string;
  clientName: string | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  sessionCount: number;
  dailyData: DailyBucket[];
}

export interface ClientUsage {
  clientName: string;
  projects: ProjectUsage[];
  totalCostUSD: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalSessions: number;
}
