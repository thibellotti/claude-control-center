import { useState, useEffect, useCallback } from 'react';
import type { DeployConfig, DeployResult } from '../../shared/types';

export function useDeploy(projectPath: string) {
  const [config, setConfig] = useState<DeployConfig>({ provider: 'none' });
  const [isDetecting, setIsDetecting] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [result, setResult] = useState<DeployResult | null>(null);
  const [history, setHistory] = useState<DeployResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Detect provider on mount
  useEffect(() => {
    let cancelled = false;

    async function detect() {
      setIsDetecting(true);
      try {
        const detected = await window.api.detectDeployProvider(projectPath);
        if (!cancelled) {
          setConfig(detected);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to detect provider');
        }
      } finally {
        if (!cancelled) setIsDetecting(false);
      }
    }

    detect();
    return () => { cancelled = true; };
  }, [projectPath]);

  // Fetch deploy history on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      try {
        const h = await window.api.getDeployHistory(projectPath);
        if (!cancelled) setHistory(h);
      } catch {
        // Ignore history fetch errors
      }
    }

    fetchHistory();
    return () => { cancelled = true; };
  }, [projectPath]);

  const deploy = useCallback(async () => {
    if (config.provider === 'none') return;

    setIsDeploying(true);
    setResult(null);
    setError(null);

    try {
      const deployResult = await window.api.deployProject(projectPath, config.provider);
      setResult(deployResult);

      // Update config with latest deploy info
      setConfig((prev) => ({
        ...prev,
        lastDeployUrl: deployResult.url,
        lastDeployTime: deployResult.timestamp,
        lastDeployStatus: deployResult.success ? 'success' : 'error',
      }));

      // Refresh history
      const updatedHistory = await window.api.getDeployHistory(projectPath);
      setHistory(updatedHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deploy failed');
    } finally {
      setIsDeploying(false);
    }
  }, [projectPath, config.provider]);

  return {
    config,
    isDetecting,
    isDeploying,
    result,
    history,
    error,
    deploy,
  };
}
