import { useState, useEffect, useCallback } from 'react';
import type { VercelDeployment, VercelProjectInfo, DeployResult } from '../../shared/types';

interface UseVercelReturn {
  detected: boolean;
  projectInfo: VercelProjectInfo | null;
  deployments: VercelDeployment[];
  history: DeployResult[];
  loading: boolean;
  deploying: boolean;
  deploy: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useVercel(projectPath: string): UseVercelReturn {
  const [detected, setDetected] = useState(false);
  const [projectInfo, setProjectInfo] = useState<VercelProjectInfo | null>(null);
  const [deployments, setDeployments] = useState<VercelDeployment[]>([]);
  const [history, setHistory] = useState<DeployResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // First check if Vercel is detected for this project
      const config = await window.api.detectDeployProvider(projectPath);
      const isVercel = config.provider === 'vercel';
      setDetected(isVercel);

      if (!isVercel) {
        setProjectInfo(null);
        setDeployments([]);
        setHistory([]);
        setLoading(false);
        return;
      }

      // Fetch all Vercel data in parallel
      const [info, deploymentsResult, deployHistory] = await Promise.all([
        window.api.getVercelProjectInfo(projectPath),
        window.api.getVercelDeployments(projectPath),
        window.api.getDeployHistory(projectPath),
      ]);

      setProjectInfo(info);
      setDeployments(deploymentsResult.deployments || []);
      setHistory(deployHistory || []);
    } catch {
      // If anything fails, still show the panel but with empty data
      setDetected(false);
      setProjectInfo(null);
      setDeployments([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  // Fetch on mount and when projectPath changes
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await fetchData();
      if (cancelled) return;
    };

    run();
    return () => { cancelled = true; };
  }, [fetchData]);

  const deploy = useCallback(async () => {
    setDeploying(true);
    try {
      await window.api.deployProject(projectPath, 'vercel');
      // Refresh data after deploy
      await fetchData();
    } finally {
      setDeploying(false);
    }
  }, [projectPath, fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    detected,
    projectInfo,
    deployments,
    history,
    loading,
    deploying,
    deploy,
    refresh,
  };
}
