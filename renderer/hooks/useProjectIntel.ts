import { useState, useEffect, useCallback } from 'react';
import type { ProjectIntelligence, DependencyAuditResult } from '../../shared/types';

interface UseProjectIntelReturn {
  intel: ProjectIntelligence | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  runAudit: () => Promise<void>;
  isAuditing: boolean;
}

export function useProjectIntel(projectPath: string | null): UseProjectIntelReturn {
  const [intel, setIntel] = useState<ProjectIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const fetchIntel = useCallback(async () => {
    if (!projectPath) {
      setIntel(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await window.api.getProjectIntel(projectPath);
      setIntel(result);
    } catch (err) {
      console.error('Failed to fetch project intel:', err);
      setError('Failed to load project intelligence');
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    fetchIntel();
  }, [fetchIntel]);

  const runAudit = useCallback(async () => {
    if (!projectPath) return;

    setIsAuditing(true);
    try {
      const auditResult: DependencyAuditResult | null = await window.api.auditDeps(projectPath);
      if (intel && auditResult) {
        setIntel({ ...intel, dependencyAudit: auditResult });
      }
    } catch (err) {
      console.error('Failed to run dependency audit:', err);
    } finally {
      setIsAuditing(false);
    }
  }, [projectPath, intel]);

  return {
    intel,
    isLoading,
    error,
    refresh: fetchIntel,
    runAudit,
    isAuditing,
  };
}
