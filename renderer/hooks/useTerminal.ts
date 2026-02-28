import { useState, useEffect, useCallback } from 'react';

export interface TerminalSession {
  id: string;
  cwd: string;
  pid: number;
  createdAt: number;
  title: string;
}

export interface FeedEntry {
  timestamp: number;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system';
  summary: string;
  projectPath: string;
  sessionId: string;
}

export function useTerminalSessions() {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const createSession = useCallback(async (cwd?: string, command?: string) => {
    const result = await window.api.ptyCreate({ cwd, command });
    const isClaude = command === 'claude';
    const session: TerminalSession = {
      id: result.id,
      cwd: result.cwd,
      pid: result.pid,
      createdAt: Date.now(),
      title: isClaude ? 'Claude' : (cwd ? cwd.split('/').pop() || 'Shell' : 'Shell'),
    };
    setSessions((prev) => [...prev, session]);
    setActiveId(result.id);
    return result.id;
  }, []);

  const killSession = useCallback(async (id: string) => {
    await window.api.ptyKill(id);
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      // Update activeId using the filtered list from this same updater
      setActiveId((currentActive) => {
        if (currentActive === id) {
          return remaining.length > 0 ? remaining[remaining.length - 1].id : null;
        }
        return currentActive;
      });
      return remaining;
    });
  }, []);

  // Listen for pty exits
  useEffect(() => {
    const cleanup = window.api.onPtyExit(({ id }) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setActiveId((prev) => {
        if (prev === id) return null;
        return prev;
      });
    });
    return cleanup;
  }, []);

  return {
    sessions,
    activeId,
    setActiveId,
    createSession,
    killSession,
  };
}

export function useLiveFeed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [active, setActive] = useState(false);
  const maxEntries = 200;

  useEffect(() => {
    if (!active) return;

    window.api.liveFeedStart();

    const cleanup = window.api.onLiveFeedData((newEntries: unknown[]) => {
      const typed = newEntries as FeedEntry[];
      setEntries((prev) => {
        const combined = [...prev, ...typed];
        return combined.slice(-maxEntries);
      });
    });

    return () => {
      cleanup();
      window.api.liveFeedStop();
    };
  }, [active]);

  const start = useCallback(() => setActive(true), []);
  const stop = useCallback(() => setActive(false), []);
  const clear = useCallback(() => setEntries([]), []);

  return { entries, active, start, stop, clear };
}
