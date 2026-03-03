import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types (mirrored from main/ipc/analytics.ts for renderer use)
// ---------------------------------------------------------------------------

interface DailyBucket {
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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAnalytics() {
  const [data, setData] = useState<ClientUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(30);

  const fetch = useCallback(
    async (
      projects: { path: string; name: string; client?: string | null }[],
      days?: number,
    ) => {
      setLoading(true);
      try {
        const result = await window.api.getAnalytics({
          projects,
          days: days || dateRange,
        });
        setData(result);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    },
    [dateRange],
  );

  return { data, loading, dateRange, setDateRange, fetch };
}
