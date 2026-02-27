import { useState, useEffect, useCallback } from 'react';
import type { GitInfo, GitHubRepoInfo } from '../../shared/types';

interface UseGitHubReturn {
  detected: boolean;
  repoInfo: GitHubRepoInfo | null;
  loading: boolean;
  refresh: () => void;
  openRepo: () => void;
  openPR: (number: number) => void;
}

export function useGitHub(projectPath: string, gitInfo: GitInfo | null): UseGitHubReturn {
  const [detected, setDetected] = useState(false);
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInfo = useCallback(async () => {
    if (!gitInfo) return;

    setLoading(true);
    try {
      const result = await window.api.getGitHubInfo(projectPath);
      if ('detected' in result && result.detected === false) {
        setDetected(false);
        setRepoInfo(null);
      } else {
        setDetected(true);
        setRepoInfo(result as GitHubRepoInfo);
      }
    } catch {
      setDetected(false);
      setRepoInfo(null);
    } finally {
      setLoading(false);
    }
  }, [projectPath, gitInfo]);

  useEffect(() => {
    if (!gitInfo) {
      setDetected(false);
      setRepoInfo(null);
      return;
    }

    fetchInfo();
  }, [fetchInfo, gitInfo]);

  const refresh = useCallback(() => {
    fetchInfo();
  }, [fetchInfo]);

  const openRepo = useCallback(() => {
    if (repoInfo) {
      window.open(`https://github.com/${repoInfo.owner}/${repoInfo.repo}`, '_blank');
    }
  }, [repoInfo]);

  const openPR = useCallback(
    (number: number) => {
      if (repoInfo) {
        window.open(`https://github.com/${repoInfo.owner}/${repoInfo.repo}/pull/${number}`, '_blank');
      }
    },
    [repoInfo]
  );

  if (!gitInfo) {
    return {
      detected: false,
      repoInfo: null,
      loading: false,
      refresh: () => {},
      openRepo: () => {},
      openPR: () => {},
    };
  }

  return {
    detected,
    repoInfo,
    loading,
    refresh,
    openRepo,
    openPR,
  };
}
