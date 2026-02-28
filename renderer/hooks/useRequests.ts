import { useState, useEffect, useCallback } from 'react';
import type { DesignRequest, TranslatedFeedEntry } from '../../shared/types';

export function useRequests(projectId?: string) {
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [feedEntries, setFeedEntries] = useState<TranslatedFeedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load requests
  useEffect(() => {
    async function load() {
      const data = await window.api.getRequests(projectId);
      setRequests(data as DesignRequest[]);
      setIsLoading(false);
    }
    load();
  }, [projectId]);

  // Listen for status updates
  useEffect(() => {
    const unsub = window.api.onRequestStatusUpdate((request: unknown) => {
      const updated = request as DesignRequest;
      setRequests((prev) => {
        const idx = prev.findIndex((r) => r.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [updated, ...prev];
      });
    });
    return unsub;
  }, []);

  // Listen for feed updates
  useEffect(() => {
    const unsub = window.api.onRequestFeedUpdate((entry: unknown) => {
      const feedEntry = entry as TranslatedFeedEntry;
      setFeedEntries((prev) => [...prev, feedEntry].slice(-200));
    });
    return unsub;
  }, []);

  const createRequest = useCallback(
    async (prompt: string, projectPath: string, attachments?: DesignRequest['attachments']) => {
      const request = await window.api.createRequest({
        projectId: projectId || '',
        projectPath,
        prompt,
        attachments,
      });
      return request as DesignRequest;
    },
    [projectId]
  );

  const approveRequest = useCallback(async (requestId: string) => {
    await window.api.approveRequest(requestId);
  }, []);

  const rejectRequest = useCallback(async (requestId: string) => {
    await window.api.rejectRequest(requestId);
  }, []);

  const cancelRequest = useCallback(async (requestId: string) => {
    await window.api.cancelRequest(requestId);
  }, []);

  const clearFeed = useCallback(() => {
    setFeedEntries([]);
  }, []);

  const activeRequest = requests.find((r) => r.status === 'in_progress');
  const pendingReview = requests.filter((r) => r.status === 'review');

  return {
    requests,
    feedEntries,
    isLoading,
    activeRequest,
    pendingReview,
    createRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
    clearFeed,
  };
}
