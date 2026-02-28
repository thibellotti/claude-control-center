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

  // Debounce timer for cleanup
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep consoleEntries in sync whenever state.output changes
  useEffect(() => {
    setConsoleEntries(parseConsoleEntries(state.output));
  }, [state.output]);

  // Track whether we've already auto-started for this path
  const autoStartedRef = useRef(false);

  // -----------------------------------------------------------------------
  // On mount: check if server is already running, auto-start if idle
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    autoStartedRef.current = false;
    async function checkStatus() {
      try {
        const current = await window.api.getDevServerStatus(projectPath);
        if (!cancelled) {
          setState(current);
          // Auto-start if idle and hasn't been auto-started yet
          if (current.status === 'idle' && !autoStartedRef.current) {
            autoStartedRef.current = true;
            try {
              const result = await window.api.startDevServer(projectPath);
              if (!cancelled) setState(result);
            } catch {
              // ignore auto-start failure
            }
          }
        }
      } catch {
        // ignore — server probably not running
      }
    }
    checkStatus();
    return () => { cancelled = true; };
  }, [projectPath]);

  // -----------------------------------------------------------------------
  // Event-driven: listen for PREVIEW_STATUS_UPDATE (throttled)
  // Status updates arrive on every stdout/stderr chunk — throttle to avoid
  // excessive re-renders while still showing status transitions immediately.
  // -----------------------------------------------------------------------
  const lastStatusRef = useRef<string>('idle');
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStateRef = useRef<EnhancedPreviewState | null>(null);

  useEffect(() => {
    const cleanup = window.api.onPreviewStatusUpdate((_incoming: unknown) => {
      const incoming = _incoming as EnhancedPreviewState;
      // Status transitions (idle→starting→ready etc.) are applied immediately
      if (incoming.status !== lastStatusRef.current) {
        lastStatusRef.current = incoming.status;
        setState(incoming);
        return;
      }
      // Output-only updates are throttled to max once per 500ms
      pendingStateRef.current = incoming;
      if (!throttleRef.current) {
        throttleRef.current = setTimeout(() => {
          throttleRef.current = null;
          if (pendingStateRef.current) {
            setState(pendingStateRef.current);
            pendingStateRef.current = null;
          }
        }, 500);
      }
    });
    return () => {
      cleanup();
      if (throttleRef.current) clearTimeout(throttleRef.current);
    };
  }, []);

  // -----------------------------------------------------------------------
  // File-change events: no iframe refresh needed — dev servers (Next.js,
  // Vite, etc.) handle HMR natively via WebSocket. A full iframe remount
  // would fight against HMR and cause jarring white-flash reloads.
  // -----------------------------------------------------------------------

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const start = useCallback(async () => {
    try {
      const result = await window.api.startDevServer(projectPath);
      setState(result);
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
