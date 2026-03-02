import { useState, useEffect } from 'react';
import type { GitHubRepoInfo, SessionTimeline, VercelProjectInfo } from '../../shared/types';

interface ProjectDetailData {
  github: GitHubRepoInfo | null;
  sessionTimelines: SessionTimeline[];
  vercel: VercelProjectInfo | null;
  loading: boolean;
}

export function useProjectDetailData(projectPath: string | null): ProjectDetailData {
  const [github, setGitHub] = useState<GitHubRepoInfo | null>(null);
  const [sessionTimelines, setSessionTimelines] = useState<SessionTimeline[]>([]);
  const [vercel, setVercel] = useState<VercelProjectInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectPath) {
      setGitHub(null);
      setSessionTimelines([]);
      setVercel(null);
      return;
    }

    setLoading(true);

    Promise.allSettled([
      window.api.getGitHubInfo(projectPath),
      window.api.getSessionTimelines(projectPath),
      window.api.getVercelProjectInfo(projectPath),
    ]).then(([ghResult, sessResult, vercelResult]) => {
      setGitHub(ghResult.status === 'fulfilled' ? ghResult.value : null);
      setSessionTimelines(
        sessResult.status === 'fulfilled' && Array.isArray(sessResult.value)
          ? sessResult.value
          : []
      );
      setVercel(vercelResult.status === 'fulfilled' ? vercelResult.value : null);
      setLoading(false);
    });
  }, [projectPath]);

  return { github, sessionTimelines, vercel, loading };
}
