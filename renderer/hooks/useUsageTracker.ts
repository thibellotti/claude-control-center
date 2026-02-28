import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UsageSummary } from '../../shared/types';

export interface DailyData {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
  sessionCount: number;
}

export interface ProjectBreakdown {
  projectPath: string;
  projectName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
  sessionCount: number;
}

export function useUsageTracker() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);

  const load = useCallback(async (days: number) => {
    setIsLoading(true);
    try {
      const result = await window.api.getUsageStats(days);
      setSummary(result || null);
    } catch {
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(dateRange);
  }, [load, dateRange]);

  const refresh = useCallback(() => {
    load(dateRange);
  }, [load, dateRange]);

  // Aggregate entries by date for chart display
  const dailyData = useMemo<DailyData[]>(() => {
    if (!summary) return [];

    const map = new Map<string, DailyData>();

    for (const entry of summary.entries) {
      const existing = map.get(entry.date);
      if (existing) {
        existing.inputTokens += entry.inputTokens;
        existing.outputTokens += entry.outputTokens;
        existing.totalTokens += entry.totalTokens;
        existing.costUSD += entry.estimatedCostUSD;
        existing.sessionCount += entry.sessionCount;
      } else {
        map.set(entry.date, {
          date: entry.date,
          inputTokens: entry.inputTokens,
          outputTokens: entry.outputTokens,
          totalTokens: entry.totalTokens,
          costUSD: entry.estimatedCostUSD,
          sessionCount: entry.sessionCount,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [summary]);

  // Aggregate entries by project
  const projectBreakdown = useMemo<ProjectBreakdown[]>(() => {
    if (!summary) return [];

    const map = new Map<string, ProjectBreakdown>();

    for (const entry of summary.entries) {
      const existing = map.get(entry.projectPath);
      if (existing) {
        existing.inputTokens += entry.inputTokens;
        existing.outputTokens += entry.outputTokens;
        existing.totalTokens += entry.totalTokens;
        existing.costUSD += entry.estimatedCostUSD;
        existing.sessionCount += entry.sessionCount;
      } else {
        map.set(entry.projectPath, {
          projectPath: entry.projectPath,
          projectName: entry.projectName,
          inputTokens: entry.inputTokens,
          outputTokens: entry.outputTokens,
          totalTokens: entry.totalTokens,
          costUSD: entry.estimatedCostUSD,
          sessionCount: entry.sessionCount,
        });
      }
    }

    // Sort by cost descending
    return Array.from(map.values()).sort((a, b) => b.costUSD - a.costUSD);
  }, [summary]);

  return {
    summary,
    isLoading,
    dateRange,
    setDateRange,
    dailyData,
    projectBreakdown,
    refresh,
  };
}
