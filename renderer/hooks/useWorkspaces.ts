import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Workspace } from '../../shared/types';

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await window.api.getWorkspaces();
      setWorkspaces(result || []);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (workspace: Partial<Workspace> & { name: string }) => {
    try {
      const saved = await window.api.saveWorkspace(workspace);
      setWorkspaces((prev) => {
        const existing = prev.findIndex((w) => w.id === saved.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = saved;
          return updated;
        }
        return [...prev, saved];
      });
      return saved;
    } catch {
      return null;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await window.api.deleteWorkspace(id);
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    } catch {
      // Silently fail
    }
  }, []);

  const addProject = useCallback(
    async (workspaceId: string, projectPath: string) => {
      setWorkspaces((prev) => {
        const workspace = prev.find((w) => w.id === workspaceId);
        if (!workspace || workspace.projectPaths.includes(projectPath)) return prev;

        // Remove project from any other workspace first
        const cleaned = prev.map((w) => {
          if (w.id === workspaceId) return w;
          if (w.projectPaths.includes(projectPath)) {
            const updated = {
              ...w,
              projectPaths: w.projectPaths.filter((p) => p !== projectPath),
              updatedAt: Date.now(),
            };
            // Fire and forget
            window.api.saveWorkspace(updated);
            return updated;
          }
          return w;
        });

        const updatedWorkspace = {
          ...workspace,
          projectPaths: [...workspace.projectPaths, projectPath],
          updatedAt: Date.now(),
        };
        // Fire and forget
        window.api.saveWorkspace(updatedWorkspace);

        return cleaned.map((w) => (w.id === workspaceId ? updatedWorkspace : w));
      });
    },
    []
  );

  const removeProject = useCallback(
    async (workspaceId: string, projectPath: string) => {
      setWorkspaces((prev) => {
        const workspace = prev.find((w) => w.id === workspaceId);
        if (!workspace) return prev;

        const updated = {
          ...workspace,
          projectPaths: workspace.projectPaths.filter((p) => p !== projectPath),
          updatedAt: Date.now(),
        };
        // Fire and forget
        window.api.saveWorkspace(updated);

        return prev.map((w) => (w.id === workspaceId ? updated : w));
      });
    },
    []
  );

  const getWorkspaceForProject = useCallback(
    (projectPath: string): Workspace | undefined => {
      return workspaces.find((w) => w.projectPaths.includes(projectPath));
    },
    [workspaces]
  );

  return {
    workspaces,
    isLoading,
    save,
    remove,
    addProject,
    removeProject,
    getWorkspaceForProject,
  };
}
