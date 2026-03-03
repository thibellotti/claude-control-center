import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { CellConfigAgentWorktree } from '../../../../shared/types';
import type { WorktreeSession } from '../../../../shared/worktree-types';

interface AgentWorktreeCellProps {
  config: CellConfigAgentWorktree;
}

export default function AgentWorktreeCell({ config }: AgentWorktreeCellProps) {
  const [session, setSession] = useState<WorktreeSession | null>(null);
  const [diffSummary, setDiffSummary] = useState<{
    filesChanged: number;
    insertions: number;
    deletions: number;
  } | null>(null);
  const [merging, setMerging] = useState(false);
  const [abandoning, setAbandoning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<unknown>(null);
  const fitRef = useRef<unknown>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load session info
  useEffect(() => {
    window.api.worktreeList().then((sessions: WorktreeSession[]) => {
      const s = sessions.find((s) => s.id === config.worktreeSessionId);
      if (s) setSession(s);
    });
  }, [config.worktreeSessionId]);

  // Inject xterm CSS
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('xterm-styles')) return;
    const style = document.createElement('style');
    style.id = 'xterm-styles';
    style.textContent = `
      .xterm { position: relative; user-select: none; -ms-user-select: none; -webkit-user-select: none; cursor: text; }
      .xterm.focus, .xterm:focus { outline: none; }
      .xterm .xterm-helpers { position: absolute; top: 0; z-index: 5; }
      .xterm .xterm-helper-textarea { padding: 0; border: 0; margin: 0; position: absolute; opacity: 0; left: -9999em; top: 0; width: 0; height: 0; z-index: -5; white-space: nowrap; overflow: hidden; resize: none; }
      .xterm .xterm-viewport { background-color: #000; overflow-y: scroll; cursor: default; position: absolute; right: 0; left: 0; top: 0; bottom: 0; }
      .xterm .xterm-screen { position: relative; }
      .xterm .xterm-screen canvas { position: absolute; left: 0; top: 0; }
      .xterm .xterm-scroll-area { visibility: hidden; }
      .xterm-char-measure-element { display: inline-block; visibility: hidden; position: absolute; top: 0; left: -9999em; line-height: normal; }
      .xterm.enable-mouse-events { cursor: default; }
      .xterm.xterm-cursor-pointer, .xterm .xterm-cursor-pointer { cursor: pointer; }
      .xterm .xterm-accessibility:not(.debug), .xterm .xterm-message { position: absolute; left: 0; top: 0; bottom: 0; right: 0; z-index: 10; color: transparent; pointer-events: none; }
      .xterm .xterm-accessibility-tree:not(.debug) *::selection { color: transparent; }
      .xterm .xterm-accessibility-tree { user-select: text; white-space: pre; }
      .xterm .live-region { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
      .xterm-dim { opacity: 0.5; }
      .xterm-underline-1 { text-decoration: underline; }
    `;
    document.head.appendChild(style);
  }, []);

  // Initialize terminal for active sessions
  useEffect(() => {
    if (!session || session.status !== 'active' || !containerRef.current) return;

    let disposed = false;
    let cleanupData: (() => void) | null = null;
    let observer: ResizeObserver | null = null;

    Promise.all([
      import('@xterm/xterm'),
      import('@xterm/addon-fit'),
      import('@xterm/addon-web-links'),
    ]).then(([xtermModule, fitModule, linksModule]) => {
      setLoadError(null);
      if (disposed || !containerRef.current) return;

      const { Terminal } = xtermModule;
      const { FitAddon } = fitModule;
      const { WebLinksAddon } = linksModule;

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
        lineHeight: 1.35,
        theme: {
          background: '#0A0A0A',
          foreground: '#E5E5E5',
          cursor: '#E5E5E5',
          cursorAccent: '#0A0A0A',
          selectionBackground: 'rgba(255, 255, 255, 0.15)',
          black: '#1A1A1A',
          red: '#FF6B6B',
          green: '#69DB7C',
          yellow: '#FFD43B',
          blue: '#748FFC',
          magenta: '#DA77F2',
          cyan: '#66D9E8',
          white: '#E5E5E5',
          brightBlack: '#555555',
          brightRed: '#FF8787',
          brightGreen: '#8CE99A',
          brightYellow: '#FFE066',
          brightBlue: '#91A7FF',
          brightMagenta: '#E599F7',
          brightCyan: '#99E9F2',
          brightWhite: '#FFFFFF',
        },
        scrollback: 5000,
        convertEol: true,
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.open(containerRef.current!);

      requestAnimationFrame(() => {
        try { fitAddon.fit(); } catch { /* ignore */ }
      });

      // Receive worktree PTY data
      cleanupData = window.api.onWorktreePtyData(
        (payload: { worktreeSessionId: string; data: string }) => {
          if (payload.worktreeSessionId === config.worktreeSessionId) {
            term.write(payload.data);
          }
        }
      );

      termRef.current = term;
      fitRef.current = fitAddon;

      observer = new ResizeObserver(() => {
        try { fitAddon.fit(); } catch { /* ignore */ }
      });
      observer.observe(containerRef.current!);
    }).catch((err) => {
      if (!disposed) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load terminal');
      }
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      cleanupData?.();
      if (termRef.current) {
        (termRef.current as { dispose: () => void }).dispose();
        termRef.current = null;
        fitRef.current = null;
      }
    };
  }, [session, config.worktreeSessionId]);

  // Listen for PTY exit to transition to completed state
  useEffect(() => {
    const cleanup = window.api.onWorktreePtyExit(
      (payload: { worktreeSessionId: string; exitCode: number }) => {
        if (payload.worktreeSessionId === config.worktreeSessionId) {
          // Refresh session
          window.api.worktreeList().then((sessions: WorktreeSession[]) => {
            const s = sessions.find((s) => s.id === config.worktreeSessionId);
            if (s) {
              setSession(s);
              if (s.diffSummary) setDiffSummary(s.diffSummary);
            }
          });
        }
      }
    );
    return cleanup;
  }, [config.worktreeSessionId]);

  // Fetch diff when completed
  useEffect(() => {
    if (session?.status === 'completed' && !diffSummary) {
      window.api.worktreeDiff(config.worktreeSessionId).then(
        (result: { summary: { filesChanged: number; insertions: number; deletions: number } }) => {
          setDiffSummary(result.summary);
        }
      ).catch(() => {
        // Diff may fail if worktree was cleaned up
      });
    }
  }, [session?.status, config.worktreeSessionId, diffSummary]);

  const handleMerge = useCallback(async () => {
    setMerging(true);
    try {
      const updated = await window.api.worktreeMerge(config.worktreeSessionId);
      setSession(updated);
    } catch (err) {
      console.error('Failed to merge worktree:', err);
    } finally {
      setMerging(false);
    }
  }, [config.worktreeSessionId]);

  const handleAbandon = useCallback(async () => {
    setAbandoning(true);
    try {
      const updated = await window.api.worktreeRemove(config.worktreeSessionId);
      setSession(updated);
    } catch (err) {
      console.error('Failed to abandon worktree:', err);
    } finally {
      setAbandoning(false);
    }
  }, [config.worktreeSessionId]);

  // Active state: show terminal
  if (!session || session.status === 'active') {
    if (loadError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#0A0A0A]">
          <p className="text-sm text-feedback-error">Terminal failed to load: {loadError}</p>
        </div>
      );
    }

    return <div ref={containerRef} className="w-full h-full bg-[#0A0A0A]" />;
  }

  // Completed state: show diff summary + merge/abandon
  if (session.status === 'completed') {
    const ds = diffSummary || session.diffSummary;
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-0 gap-4 p-4">
        <div className="text-center space-y-2">
          <p className="text-xs font-medium text-text-secondary">
            Agent completed on branch <span className="font-mono text-accent">{session.branchName}</span>
          </p>
          {ds && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-text-tertiary">{ds.filesChanged} file{ds.filesChanged !== 1 ? 's' : ''} changed</span>
              <span className="text-green-400">+{ds.insertions}</span>
              <span className="text-red-400">-{ds.deletions}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMerge}
            disabled={merging}
            className="px-3 py-1.5 rounded-button text-xs font-medium bg-green-600 text-white hover:bg-green-500 transition-colors disabled:opacity-50"
          >
            {merging ? 'Merging...' : 'Merge'}
          </button>
          <button
            onClick={handleAbandon}
            disabled={abandoning}
            className="px-3 py-1.5 rounded-button text-xs font-medium bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {abandoning ? 'Abandoning...' : 'Abandon'}
          </button>
        </div>
      </div>
    );
  }

  // Merged or Abandoned state: show status badge
  return (
    <div className="flex items-center justify-center h-full bg-surface-0">
      <div className="text-center space-y-2">
        <span
          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
            session.status === 'merged'
              ? 'bg-green-600/10 text-green-400'
              : 'bg-red-600/10 text-red-400'
          }`}
        >
          {session.status === 'merged' ? 'Merged' : 'Abandoned'}
        </span>
        <p className="text-xs text-text-tertiary font-mono">{session.branchName}</p>
      </div>
    </div>
  );
}
