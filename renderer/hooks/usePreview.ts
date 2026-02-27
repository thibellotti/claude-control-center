import { useState, useEffect, useCallback, useRef } from 'react';
import type { EnhancedPreviewState, ConsoleEntry } from '../../shared/types';

// ---------------------------------------------------------------------------
// Viewport helpers
// ---------------------------------------------------------------------------

export type ViewportMode = 'desktop' | 'tablet' | 'mobile' | 'custom';

export interface ViewportState {
  mode: ViewportMode;
  width: number;
}

const VIEWPORT_PRESETS: Record<Exclude<ViewportMode, 'custom'>, number> = {
  desktop: 9999,
  tablet: 768,
  mobile: 375,
};

// ---------------------------------------------------------------------------
// Console-entry parser
// ---------------------------------------------------------------------------

function parseConsoleEntries(output: string[]): ConsoleEntry[] {
  return output.map((line) => {
    const lower = line.toLowerCase();
    let level: ConsoleEntry['level'] = 'log';
    if (lower.includes('error')) level = 'error';
    else if (lower.includes('warn')) level = 'warn';
    else if (lower.includes('info')) level = 'info';

    return { level, message: line, timestamp: Date.now() };
  });
}

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const DEFAULT_STATE: EnhancedPreviewState = {
  status: 'idle',
  url: null,
  port: null,
  output: [],
  error: null,
  scriptName: null,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePreview(projectPath: string) {
  const [state, setState] = useState<EnhancedPreviewState>(DEFAULT_STATE);
  const [viewport, setViewportState] = useState<ViewportState>({ mode: 'desktop', width: 9999 });
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [iframeKey, setIframeKey] = useState(0);
  const [showConsole, setShowConsole] = useState(false);

  // Debounce timer for file-change auto-refresh
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep consoleEntries in sync whenever state.output changes
  useEffect(() => {
    setConsoleEntries(parseConsoleEntries(state.output));
  }, [state.output]);

  // -----------------------------------------------------------------------
  // On mount: check if server is already running
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function checkStatus() {
      try {
        const current = await window.api.getDevServerStatus(projectPath);
        if (!cancelled) setState(current);
      } catch {
        // ignore — server probably not running
      }
    }
    checkStatus();
    return () => { cancelled = true; };
  }, [projectPath]);

  // -----------------------------------------------------------------------
  // Event-driven: listen for PREVIEW_STATUS_UPDATE
  // -----------------------------------------------------------------------
  useEffect(() => {
    const cleanup = window.api.onPreviewStatusUpdate((incoming: EnhancedPreviewState) => {
      setState(incoming);
    });
    return cleanup;
  }, []);

  // -----------------------------------------------------------------------
  // Event-driven: listen for PREVIEW_FILE_CHANGED, debounce 300ms refresh
  // -----------------------------------------------------------------------
  useEffect(() => {
    const cleanup = window.api.onPreviewFileChanged((data: { projectPath: string; filePath: string }) => {
      if (data.projectPath !== projectPath) return;

      // Debounce: wait 300ms after last change before refreshing
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setIframeKey((k) => k + 1);
      }, 300);
    });

    return () => {
      cleanup();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [projectPath]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const start = useCallback(async () => {
    try {
      const result = await window.api.startDevServer(projectPath);
      setState(result);
      // Start file watching once server is starting
      await window.api.previewStartWatching(projectPath);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to start server',
      }));
    }
  }, [projectPath]);

  const stop = useCallback(async () => {
    try {
      await window.api.previewStopWatching(projectPath);
      await window.api.stopDevServer(projectPath);
      setState(DEFAULT_STATE);
    } catch {
      // ignore
    }
  }, [projectPath]);

  const refresh = useCallback(() => {
    setIframeKey((k) => k + 1);
  }, []);

  const setViewport = useCallback((mode: string, width?: number) => {
    const m = mode as ViewportMode;
    if (m === 'custom') {
      setViewportState({ mode: 'custom', width: width ?? 1024 });
    } else {
      setViewportState({ mode: m, width: VIEWPORT_PRESETS[m] ?? 9999 });
    }
  }, []);

  const clearConsole = useCallback(() => {
    setConsoleEntries([]);
  }, []);

  // -----------------------------------------------------------------------
  // Cleanup on unmount
  // -----------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    state,
    viewport,
    consoleEntries,
    iframeKey,
    showConsole,
    start,
    stop,
    refresh,
    setViewport,
    setShowConsole,
    clearConsole,
  };
}
