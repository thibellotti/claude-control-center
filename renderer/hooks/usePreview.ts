import { useState, useEffect, useCallback, useRef } from 'react';
import type { PreviewState } from '../../shared/types';

export type Viewport = 'desktop' | 'tablet' | 'mobile';

export const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export function usePreview(projectPath: string) {
  const [state, setState] = useState<PreviewState>({
    url: null,
    isRunning: false,
    port: null,
    output: [],
    error: null,
  });
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [isStarting, setIsStarting] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for status while running
  useEffect(() => {
    if (state.isRunning) {
      pollRef.current = setInterval(async () => {
        try {
          const status = await window.api.getDevServerStatus(projectPath);
          setState(status);
        } catch {
          // ignore polling errors
        }
      }, 2000);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [state.isRunning, projectPath]);

  // Check initial status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const status = await window.api.getDevServerStatus(projectPath);
        setState(status);
      } catch {
        // ignore
      }
    }
    checkStatus();
  }, [projectPath]);

  const start = useCallback(async () => {
    setIsStarting(true);
    try {
      const result = await window.api.startDevServer(projectPath);
      setState(result);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to start server',
      }));
    } finally {
      setIsStarting(false);
    }
  }, [projectPath]);

  const stop = useCallback(async () => {
    try {
      await window.api.stopDevServer(projectPath);
      setState({
        url: null,
        isRunning: false,
        port: null,
        output: [],
        error: null,
      });
    } catch {
      // ignore
    }
  }, [projectPath]);

  const refresh = useCallback(() => {
    setIframeKey((k) => k + 1);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  return {
    state,
    viewport,
    setViewport,
    isStarting,
    iframeKey,
    start,
    stop,
    refresh,
  };
}
