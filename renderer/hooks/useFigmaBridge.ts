import { useState, useEffect, useCallback } from 'react';
import type { FigmaLink } from '../../shared/types';

/**
 * Parse a Figma design URL to extract fileKey and nodeId.
 * Returns null if the URL is not a valid Figma design URL.
 */
export function parseFigmaUrl(
  url: string
): { fileKey: string; nodeId: string } | null {
  try {
    const parsed = new URL(url);

    if (
      !parsed.hostname.endsWith('figma.com') &&
      parsed.hostname !== 'figma.com'
    ) {
      return null;
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
      return null;
    }

    const pathType = segments[0];
    if (pathType !== 'design' && pathType !== 'file') {
      return null;
    }

    const fileKey = segments[1];
    if (!fileKey) {
      return null;
    }

    const rawNodeId = parsed.searchParams.get('node-id');
    const nodeId = rawNodeId ? rawNodeId.replace(/-/g, ':') : '';

    return { fileKey, nodeId };
  } catch {
    return null;
  }
}

export function useFigmaBridge(projectId: string) {
  const [links, setLinks] = useState<FigmaLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load links on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const result = await window.api.getFigmaLinks(projectId);
        if (!cancelled) {
          setLinks(result || []);
        }
      } catch {
        if (!cancelled) {
          setLinks([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const addLink = useCallback(
    async (url: string, label: string) => {
      const parsed = parseFigmaUrl(url);
      if (!parsed) {
        throw new Error('Invalid Figma URL');
      }

      const linkData = {
        figmaUrl: url,
        nodeId: parsed.nodeId,
        fileKey: parsed.fileKey,
        label,
      };

      const saved = await window.api.saveFigmaLink(projectId, linkData);
      setLinks((prev) => [...prev, saved as FigmaLink]);
      return saved;
    },
    [projectId]
  );

  const removeLink = useCallback(
    async (linkId: string) => {
      await window.api.deleteFigmaLink(projectId, linkId);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    },
    [projectId]
  );

  return {
    links,
    addLink,
    removeLink,
    isLoading,
  };
}
