import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Use a ref for onRefresh to prevent infinite loops in useEffect
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const initialLoadDone = useRef(false);

  const fetchProjects = useCallback(async () => {
    try {
      // Only show loading spinner on initial load, not on background refreshes
      if (!initialLoadDone.current) {
        setLoading(true);
      }
      setError(null);
      const result = await window.api.getProjects();
      setProjects(result || []);
      initialLoadDone.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const result = await window.api.refreshProjects();
      setProjects(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh projects');
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
            try {
              if (onRefreshRef.current && 'hints' in data && Array.isArray(data.hints)) {
                onRefreshRef.current(data.hints);
              }
            } catch (err) {
              console.error('onRefresh callback failed:', err);
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
  }, [fetchProjects]);

  return { projects, loading, error, refresh };
}
