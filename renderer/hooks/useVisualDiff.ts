import { useState, useEffect, useCallback, useRef } from 'react';
import type { ScreenshotEntry } from '../../shared/types';

export interface ViewportPreset {
  label: string;
  width: number;
  height: number;
}

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  { label: 'Desktop', width: 1440, height: 900 },
  { label: 'Tablet', width: 768, height: 1024 },
  { label: 'Mobile', width: 375, height: 812 },
];

export function useVisualDiff(projectId: string) {
  const [screenshots, setScreenshots] = useState<ScreenshotEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comparison pair: [before, after]
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Image cache: imagePath -> base64 data URL
  const imageCache = useRef<Map<string, string>>(new Map());

  // Load screenshots on mount and when projectId changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await window.api.getScreenshots(projectId);
        if (!cancelled) {
          setScreenshots(result || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load screenshots'
          );
          setScreenshots([]);
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

  // Capture a new screenshot
  const capture = useCallback(
    async (
      url: string,
      label: string,
      viewport: { width: number; height: number },
      commitHash?: string,
      commitMessage?: string
    ) => {
      setIsCapturing(true);
      setError(null);
      try {
        const entry = await window.api.captureScreenshot({
          url,
          label,
          projectId,
          viewport,
          commitHash,
          commitMessage,
        });
        setScreenshots((prev) => [entry, ...prev]);
        return entry;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Screenshot capture failed';
        setError(msg);
        throw err;
      } finally {
        setIsCapturing(false);
      }
    },
    [projectId]
  );

  // Remove a screenshot
  const remove = useCallback(
    async (screenshotId: string) => {
      try {
        await window.api.deleteScreenshot({ projectId, screenshotId });
        setScreenshots((prev) => prev.filter((s) => s.id !== screenshotId));
        setSelectedIds((prev) => prev.filter((id) => id !== screenshotId));
        imageCache.current.delete(screenshotId);
      } catch {
        // Silently fail on delete errors
      }
    },
    [projectId]
  );

  // Toggle selection for comparison (max 2)
  const selectForComparison = useCallback((screenshotId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(screenshotId)) {
        return prev.filter((id) => id !== screenshotId);
      }
      if (prev.length >= 2) {
        // Replace the oldest selection
        return [prev[1], screenshotId];
      }
      return [...prev, screenshotId];
    });
  }, []);

  // Clear comparison selection
  const clearComparison = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Load image as base64 via IPC (with caching)
  const loadImage = useCallback(
    async (imagePath: string): Promise<string | null> => {
      const cached = imageCache.current.get(imagePath);
      if (cached) return cached;

      try {
        const dataUrl = await window.api.getScreenshotImage(imagePath);
        if (dataUrl) {
          imageCache.current.set(imagePath, dataUrl);
        }
        return dataUrl;
      } catch {
        return null;
      }
    },
    []
  );

  // Get selected pair as ScreenshotEntry objects, sorted by timestamp (older = before)
  const selectedPair: [ScreenshotEntry, ScreenshotEntry] | null =
    selectedIds.length === 2
      ? (() => {
          const a = screenshots.find((s) => s.id === selectedIds[0]);
          const b = screenshots.find((s) => s.id === selectedIds[1]);
          if (!a || !b) return null;
          // Older screenshot is "before", newer is "after"
          return a.timestamp <= b.timestamp ? [a, b] : [b, a];
        })()
      : null;

  return {
    screenshots,
    isLoading,
    isCapturing,
    error,
    capture,
    remove,
    selectedIds,
    selectedPair,
    selectForComparison,
    clearComparison,
    loadImage,
  };
}
