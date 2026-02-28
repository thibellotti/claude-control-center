import { useState, useEffect, useCallback } from 'react';
import type { GitHubRepoInfo } from '../../shared/types';

export type GitHubData =
  | { detected: false }
  | GitHubRepoInfo;

export function useGitHub(projectPath: string) {
  const [data, setData] = useState<GitHubData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.api.getGitHubInfo(projectPath) as GitHubData;
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refresh: fetchData };
}
