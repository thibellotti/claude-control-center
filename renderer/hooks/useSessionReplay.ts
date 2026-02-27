import { useState, useEffect, useCallback } from 'react';
import type { SessionTimeline } from '../../shared/types';

export function useSessionReplay(projectPath: string) {
  const [sessions, setSessions] = useState<SessionTimeline[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionTimeline | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Load the list of sessions (metadata only)
  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      setIsLoadingList(true);
      try {
        const result = await window.api.getSessionTimelines(projectPath);
        if (!cancelled) {
          setSessions(result || []);
        }
      } catch {
        if (!cancelled) {
          setSessions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingList(false);
        }
      }
    }

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  // Select a session and load its full detail
  const selectSession = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((s) => s.sessionId === sessionId);
      if (!session) return;

      setIsLoadingDetail(true);
      try {
        const detail = await window.api.getSessionTimelineDetail(
          projectPath,
          session.fileName
        );
        if (detail) {
          setSelectedSession(detail);
        }
      } catch {
        // Keep metadata even if detail fails
        setSelectedSession(session);
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [sessions, projectPath]
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedSession(null);
  }, []);

  return {
    sessions,
    selectedSession,
    selectSession,
    clearSelection,
    isLoadingList,
    isLoadingDetail,
  };
}
