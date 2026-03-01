import { useState, useEffect, useCallback } from 'react';
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
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace || workspace.projectPaths.includes(projectPath)) return;

      // Snapshot for rollback
      const previousWorkspaces = workspaces;

      // Remove project from any other workspace first
      const cleaned = workspaces.map((w) => {
        if (w.id === workspaceId) return w;
        if (w.projectPaths.includes(projectPath)) {
          return {
            ...w,
            projectPaths: w.projectPaths.filter((p) => p !== projectPath),
            updatedAt: Date.now(),
          };
        }
        return w;
      });

      const updatedWorkspace = {
        ...workspace,
        projectPaths: [...workspace.projectPaths, projectPath],
        updatedAt: Date.now(),
      };

      const optimistic = cleaned.map((w) => (w.id === workspaceId ? updatedWorkspace : w));

      // Optimistic update
      setWorkspaces(optimistic);

      try {
        // Save all changed workspaces
        const savePromises: Promise<unknown>[] = [];
        for (const w of optimistic) {
          const original = previousWorkspaces.find((pw) => pw.id === w.id);
          if (original !== w) {
            savePromises.push(window.api.saveWorkspace(w));
          }
        }
        await Promise.all(savePromises);
      } catch (err) {
        console.error('Failed to save workspace:', err);
        setWorkspaces(previousWorkspaces);
      }
    },
    [workspaces]
  );

  const removeProject = useCallback(
    async (workspaceId: string, projectPath: string) => {
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace) return;

      const previousWorkspaces = workspaces;

      const updated = {
        ...workspace,
        projectPaths: workspace.projectPaths.filter((p) => p !== projectPath),
        updatedAt: Date.now(),
      };

      // Optimistic update
      setWorkspaces((prev) => prev.map((w) => (w.id === workspaceId ? updated : w)));

      try {
        await window.api.saveWorkspace(updated);
      } catch (err) {
        console.error('Failed to save workspace:', err);
        setWorkspaces(previousWorkspaces);
      }
    },
    [workspaces]
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
