import { useState, useEffect, useCallback } from 'react';
import type { GitHubRepoInfo, PRDetail, PRCheck, CreatePROptions } from '../../shared/types';

export type GitHubData =
  | { detected: false }
  | GitHubRepoInfo;

export function useGitHub(projectPath: string) {
  const [data, setData] = useState<GitHubData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.api.getGitHubInfo(projectPath);
      if (result && typeof result === 'object') {
        setData(result as GitHubData);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getPRDetail = useCallback(async (prNumber: number): Promise<PRDetail | null> => {
    try {
      return await window.api.getPRDetail({ projectPath, prNumber });
    } catch {
      return null;
    }
  }, [projectPath]);

  const createPR = useCallback(async (opts: Omit<CreatePROptions, 'projectPath'>): Promise<{ url: string } | { error: string }> => {
    try {
      return await window.api.createPR({ projectPath, ...opts });
    } catch (err) {
      return { error: (err as Error).message || 'Failed to create PR' };
    }
  }, [projectPath]);

  const getPRChecks = useCallback(async (prNumber: number): Promise<PRCheck[]> => {
    try {
      return await window.api.getPRChecks({ projectPath, prNumber });
    } catch {
      return [];
    }
  }, [projectPath]);

  return { data, loading, refresh: fetchData, getPRDetail, createPR, getPRChecks };
}
