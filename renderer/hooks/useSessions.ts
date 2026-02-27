import { useState, useEffect, useCallback } from 'react';
import type { ActiveSession } from '../../shared/types';

export function useActiveSessions(pollInterval = 5000) {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);

  const fetchSessions = useCallback(async () => {
    try {
      const result = await window.api.getActiveSessions();
      setSessions(result || []);
    } catch {
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, pollInterval);
    return () => clearInterval(interval);
  }, [fetchSessions, pollInterval]);

  const getSessionForProject = useCallback(
    (projectPath: string) => sessions.find((s) => s.projectPath === projectPath) || null,
    [sessions]
  );

  return { sessions, getSessionForProject };
}
