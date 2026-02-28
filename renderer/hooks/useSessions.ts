import { useState, useEffect, useCallback } from 'react';
import type { ActiveSession } from '../../shared/types';

export function useActiveSessions(pollInterval = 10000) {
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

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchSessions();
      }
    }, pollInterval);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchSessions();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchSessions, pollInterval]);

  const getSessionForProject = useCallback(
    (projectPath: string) => sessions.find((s) => s.projectPath === projectPath) || null,
    [sessions]
  );

  return { sessions, getSessionForProject };
}
