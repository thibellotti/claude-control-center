import { useState, useEffect, useCallback } from 'react';
import type { Project } from '../../shared/types';

export function useProjectDetail(projectPath: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectPath) {
      setProject(null);
      return;
    }
    setLoading(true);
    window.api
      .getProjectDetail(projectPath)
      .then(setProject)
      .finally(() => setLoading(false));
  }, [projectPath]);

  return { project, loading };
}

export function useProjects(onRefresh?: (hints: string[]) => void) {
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

    // Listen for project updates from the file watcher.
    // The watcher sends { refresh: true, hints: [...] } for filesystem changes,
    // but individual handlers may send a full Project object.
    const cleanup = window.api.onProjectUpdated(
      (data: { refresh?: boolean; hints?: string[] } | Project) => {
        if (data && 'refresh' in data && data.refresh) {
          // Refresh signal from file watcher — re-fetch all projects, then notify caller
          fetchProjects().then(() => {
            if (onRefresh && 'hints' in data && Array.isArray(data.hints)) {
              onRefresh(data.hints);
            }
          });
        } else {
          // Individual project update — merge into existing list
          const updatedProject = data as Project;
          setProjects((prev) =>
            prev.map((p) => (p.path === updatedProject.path ? updatedProject : p))
          );
        }
      }
    );

    return cleanup;
  }, [fetchProjects, onRefresh]);

  return { projects, loading, error, refresh };
}
