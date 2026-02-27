import { useState, useEffect, useCallback } from 'react';
import type { Project } from '../../shared/types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.api.getProjects();
      setProjects(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.api.refreshProjects();
      setProjects(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();

    // Listen for individual project updates
    const cleanup = window.api.onProjectUpdated((updatedProject: Project) => {
      setProjects((prev) =>
        prev.map((p) => (p.path === updatedProject.path ? updatedProject : p))
      );
    });

    return cleanup;
  }, [fetchProjects]);

  return { projects, loading, error, refresh };
}
