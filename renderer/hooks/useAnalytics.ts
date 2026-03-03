import { useState, useCallback } from 'react';
import type { ClientUsage } from '../../shared/analytics-types';

// Re-export shared types for existing consumers
export type { ProjectUsage, ClientUsage } from '../../shared/analytics-types';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAnalytics() {
  const [data, setData] = useState<ClientUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(30);

  const loadAnalytics = useCallback(
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
        setError(null);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    },
    [dateRange],
  );

  return { data, loading, error, dateRange, setDateRange, loadAnalytics };
}
