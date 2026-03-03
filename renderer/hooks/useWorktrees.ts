import { useState, useEffect, useCallback } from 'react';
import type { WorktreeSession } from '../../shared/worktree-types';

export function useWorktrees(projectPath?: string) {
  const [sessions, setSessions] = useState<WorktreeSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await window.api.worktreeList(
        projectPath ? { projectPath } : undefined
      );
      setSessions(data);
    } catch (err) {
      console.error('Failed to load worktree sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for PTY exit events to refresh session state
  useEffect(() => {
    const cleanup = window.api.onWorktreePtyExit(() => {
      refresh();
    });
    return cleanup;
  }, [refresh]);

  const create = useCallback(
    async (opts: { projectPath: string; branchName?: string }) => {
      const session = await window.api.worktreeCreate(opts);
      setSessions((prev) => [...prev, session]);
      return session;
    },
    []
  );

  const spawnAgent = useCallback(
    async (worktreeSessionId: string, command?: string) => {
      return window.api.worktreeSpawnAgent({ worktreeSessionId, command });
    },
    []
  );

  const getDiff = useCallback(async (worktreeSessionId: string) => {
    return window.api.worktreeDiff(worktreeSessionId);
  }, []);

  const merge = useCallback(
    async (worktreeSessionId: string) => {
      const updated = await window.api.worktreeMerge(worktreeSessionId);
      setSessions((prev) =>
        prev.map((s) => (s.id === worktreeSessionId ? updated : s))
      );
      return updated;
    },
    []
  );

  const remove = useCallback(
    async (worktreeSessionId: string) => {
      const updated = await window.api.worktreeRemove(worktreeSessionId);
      setSessions((prev) =>
        prev.map((s) => (s.id === worktreeSessionId ? updated : s))
      );
      return updated;
    },
    []
  );

  return { sessions, loading, create, spawnAgent, getDiff, merge, remove, refresh };
}
