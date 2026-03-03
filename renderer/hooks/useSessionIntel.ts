import { useState, useEffect, useCallback } from 'react';
import type { SessionIntelSummary, SessionMetrics } from '../../shared/session-intel-types';

interface UseSessionIntelReturn {
  summary: SessionIntelSummary | null;
  selectedSession: SessionMetrics | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  selectSession: (sessionId: string) => void;
}

export function useSessionIntel(projectPath: string): UseSessionIntelReturn {
  const [summary, setSummary] = useState<SessionIntelSummary | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.analyzeSessionIntel(projectPath);
      setSummary(result || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze sessions');
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    load();
  }, [load]);

  const selectSession = useCallback(
    async (sessionId: string) => {
      // First check if we already have it in the summary
      const cached = summary?.sessions.find((s) => s.sessionId === sessionId);
      if (cached) {
        setSelectedSession(cached);
        return;
      }

      try {
        const detail = await window.api.getSessionDetail(sessionId, projectPath);
        setSelectedSession(detail || null);
      } catch {
        // Silently fail — session may not exist
        setSelectedSession(null);
      }
    },
    [summary, projectPath]
  );

  return {
    summary,
    selectedSession,
    isLoading,
    error,
    refresh,
    selectSession,
  };
}
