import { useState, useEffect, useCallback, useRef } from 'react';
import type { DiffResult } from '../../shared/types';

export function useDiffViewer(
  projectPath: string,
  mode: 'live' | 'review',
  fromRef?: string,
  toRef?: string
) {
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDiff = useCallback(async () => {
    try {
      const result = await window.api.getGitDiff({ projectPath, fromRef, toRef });
      setDiff(result);
    } catch (err) {
      console.error('Failed to fetch git diff:', err);
    } finally {
      setLoading(false);
    }
  }, [projectPath, fromRef, toRef]);

  const fetchStatus = useCallback(async () => {
    try {
      const result = await window.api.getGitStatusLive(projectPath);
      setDiff(result);
    } catch (err) {
      console.error('Failed to fetch git status:', err);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  const refresh = useCallback(() => {
    setLoading(true);
    if (mode === 'live') {
      fetchStatus();
    } else {
      fetchDiff();
    }
  }, [mode, fetchStatus, fetchDiff]);

  useEffect(() => {
    if (mode === 'live') {
      fetchStatus();
      intervalRef.current = setInterval(fetchStatus, 3000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      fetchDiff();
    }
  }, [mode, fetchStatus, fetchDiff]);

  return { diff, loading, refresh };
}
