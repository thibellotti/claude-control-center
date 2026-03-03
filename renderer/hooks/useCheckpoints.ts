import { useState, useEffect, useCallback } from 'react';
import type { SessionCheckpoint } from '../../shared/types';

export function useCheckpoints(projectPath: string) {
  const [checkpoints, setCheckpoints] = useState<SessionCheckpoint[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!projectPath) return;
    try {
      const result = await window.api.getCheckpoints(projectPath);
      setCheckpoints(result || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (name: string, description?: string) => {
      try {
        const checkpoint = await window.api.createCheckpoint({
          projectPath,
          name,
          description,
        });
        setCheckpoints((prev) => [checkpoint, ...prev]);
        return checkpoint;
      } catch {
        return null;
      }
    },
    [projectPath]
  );

  const restore = useCallback(
    async (checkpointId: string) => {
      try {
        return await window.api.restoreCheckpoint({ projectPath, checkpointId });
      } catch {
        return false;
      }
    },
    [projectPath]
  );

  const remove = useCallback(
    async (checkpointId: string) => {
      try {
        await window.api.deleteCheckpoint({ projectPath, checkpointId });
        setCheckpoints((prev) => prev.filter((c) => c.id !== checkpointId));
      } catch {
        // Silently fail
      }
    },
    [projectPath]
  );

  return { checkpoints, loading, refresh, create, restore, remove };
}
