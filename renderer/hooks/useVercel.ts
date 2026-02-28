import { useState, useEffect, useCallback } from 'react';
import type { VercelDeployment, VercelProjectInfo, DeployConfig, DeployResult } from '../../shared/types';

export interface VercelData {
  projectInfo: VercelProjectInfo;
  deployments: VercelDeployment[];
  deployConfig: DeployConfig;
}

export function useVercel(projectPath: string) {
  const [data, setData] = useState<VercelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projectInfo, deploymentsResult, deployConfig] = await Promise.all([
        window.api.getVercelProjectInfo(projectPath) as Promise<VercelProjectInfo>,
        window.api.getVercelDeployments(projectPath) as Promise<{ deployments: VercelDeployment[] }>,
        window.api.detectDeployProvider(projectPath) as Promise<DeployConfig>,
      ]);
      setData({
        projectInfo,
        deployments: deploymentsResult.deployments,
        deployConfig,
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const deploy = useCallback(async (): Promise<DeployResult | null> => {
    setDeploying(true);
    try {
      const result = await window.api.deployProject(projectPath, 'vercel') as DeployResult;
      await fetchData();
      return result;
    } catch {
      return null;
    } finally {
      setDeploying(false);
    }
  }, [projectPath, fetchData]);

  return { data, loading, deploying, refresh: fetchData, deploy };
}
