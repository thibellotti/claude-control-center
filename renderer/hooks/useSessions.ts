import { useState, useEffect, useCallback, useRef } from 'react';
import type { ActiveSession } from '../../shared/types';

function sessionsEqual(a: ActiveSession[], b: ActiveSession[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].projectPath !== b[i].projectPath || a[i].pid !== b[i].pid) return false;
  }
  return true;
}

export function useActiveSessions(pollInterval = 10000) {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const sessionsRef = useRef(sessions);

  const fetchSessions = useCallback(async () => {
    try {
      const result = await window.api.getActiveSessions();
      const next = result || [];
      // Only update state if sessions actually changed to avoid cascading re-renders
      if (!sessionsEqual(sessionsRef.current, next)) {
        sessionsRef.current = next;
        setSessions(next);
      }
    } catch {
      if (sessionsRef.current.length > 0) {
        sessionsRef.current = [];
        setSessions([]);
      }
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
