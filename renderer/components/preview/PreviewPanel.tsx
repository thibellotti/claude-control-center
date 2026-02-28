import React, { useRef, useEffect } from 'react';
import { usePreview } from '../../hooks/usePreview';
import PreviewToolbar from './PreviewToolbar';
import { PlayCircleIcon, SpinnerIcon, TrashIcon, ErrorCircleIcon } from '../icons';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PreviewPanelProps {
  projectPath: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="animate-bounce [animation-delay:0ms] w-1 h-1 rounded-full bg-text-tertiary inline-block" />
      <span className="animate-bounce [animation-delay:150ms] w-1 h-1 rounded-full bg-text-tertiary inline-block" />
      <span className="animate-bounce [animation-delay:300ms] w-1 h-1 rounded-full bg-text-tertiary inline-block" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Console line color helper
// ---------------------------------------------------------------------------

function lineColorClass(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes('error')) return 'text-feedback-error';
  if (lower.includes('warn')) return 'text-feedback-warning';
  return 'text-text-tertiary';
}

// ---------------------------------------------------------------------------
// Status label for loading states
// ---------------------------------------------------------------------------

function statusLabel(status: string): string {
  switch (status) {
    case 'detecting': return 'Detecting framework';
    case 'installing': return 'Installing dependencies';
    case 'starting': return 'Starting server';
    default: return 'Loading';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PreviewPanel({ projectPath }: PreviewPanelProps) {
  const {
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
  } = usePreview(projectPath);

  // Auto-scroll console to bottom
  const consoleEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showConsole && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showConsole, state.output]);

  const handleOpenBrowser = () => {
    if (state.url) {
      window.open(state.url, '_blank');
    }
  };

  // Determine viewport CSS width
  const viewportWidth = viewport.mode === 'desktop' ? '100%' : `${viewport.width}px`;

  const isLoading = state.status === 'detecting' || state.status === 'installing' || state.status === 'starting';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <PreviewToolbar
        state={state}
        viewport={viewport}
        showConsole={showConsole}
        consoleCount={consoleEntries.length}
        onStart={start}
        onStop={stop}
        onRefresh={refresh}
        onViewportChange={setViewport}
        onToggleConsole={() => setShowConsole(!showConsole)}
        onOpenBrowser={handleOpenBrowser}
      />

      {/* Main content area */}
      <div className="flex-1 bg-surface-0 overflow-hidden relative">
        {/* ── Idle state ──────────────────────────────────────────────── */}
        {state.status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="text-text-tertiary">
              <PlayCircleIcon />
            </div>
            <div className="text-center">
              <p className="text-sm text-text-secondary mb-1">No dev server running</p>
              <p className="text-xs text-text-tertiary">Start the dev server to preview your project</p>
            </div>
            <button
              onClick={start}
              className="flex items-center gap-2 px-4 py-2 rounded-button text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              Start Preview
            </button>
          </div>
        )}

        {/* ── Loading states (detecting / installing / starting) ────── */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="text-text-tertiary">
              <SpinnerIcon size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm text-text-secondary flex items-center gap-2">
                {statusLabel(state.status)} <LoadingDots />
              </p>
              {state.scriptName && (
                <p className="text-xs text-text-tertiary mt-1">
                  Script: <span className="font-mono">{state.scriptName}</span>
                </p>
              )}
            </div>
            {state.error && (
              <p className="text-xs text-feedback-warning mt-1 max-w-md text-center">{state.error}</p>
            )}
            {/* Recent output while loading */}
            {state.output.length > 0 && (
              <div className="w-full max-w-lg mt-4 px-4">
                <div className="bg-surface-2 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <pre className="text-micro font-mono text-text-tertiary leading-relaxed whitespace-pre-wrap break-all">
                    {state.output.slice(-10).join('\n')}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Ready: iframe preview ───────────────────────────────────── */}
        {state.status === 'ready' && state.url && (
          <div className="absolute inset-0 flex justify-center overflow-auto bg-surface-2">
            <div
              className="h-full transition-[width] duration-300 ease-in-out bg-white"
              style={{ width: viewportWidth, maxWidth: '100%' }}
            >
              <iframe
                key={iframeKey}
                src={state.url}
                className="w-full h-full border-0"
                style={{ backgroundColor: 'white' }}
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            </div>
          </div>
        )}

        {/* ── Error state ─────────────────────────────────────────────── */}
        {state.status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 rounded-full bg-feedback-error-muted flex items-center justify-center text-feedback-error">
              <ErrorCircleIcon size={20} />
            </div>
            <div className="text-center max-w-md">
              <p className="text-sm text-text-secondary mb-1">Server failed to start</p>
              {state.error && (
                <p className="text-xs text-feedback-error mt-1">{state.error}</p>
              )}
            </div>
            <button
              onClick={start}
              className="flex items-center gap-2 px-4 py-2 rounded-button text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              Retry
            </button>
            {/* Show output lines for debugging */}
            {state.output.length > 0 && (
              <div className="w-full max-w-lg mt-2 px-4">
                <div className="bg-surface-2 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <pre className="text-micro font-mono text-feedback-error/80 leading-relaxed whitespace-pre-wrap break-all">
                    {state.output.slice(-15).join('\n')}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Console (collapsible) ────────────────────────────────────── */}
      {showConsole && (
        <div className="border-t border-border-subtle bg-surface-1 shrink-0" style={{ maxHeight: '200px' }}>
          {/* Console header */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle">
            <span className="text-micro font-medium text-text-tertiary uppercase tracking-wider">Console</span>
            <button
              onClick={clearConsole}
              className="flex items-center gap-1 text-micro text-text-tertiary hover:text-text-secondary transition-colors"
              title="Clear console"
            >
              <TrashIcon />
            </button>
          </div>

          {/* Console output */}
          <div className="overflow-y-auto px-3 py-2" style={{ maxHeight: '168px' }}>
            {state.output.length === 0 ? (
              <p className="text-micro font-mono text-text-tertiary">No output yet.</p>
            ) : (
              <div className="space-y-px">
                {state.output.map((line, i) => (
                  <pre
                    key={i}
                    className={`text-micro font-mono leading-relaxed whitespace-pre-wrap break-all ${lineColorClass(line)}`}
                  >
                    {line}
                  </pre>
                ))}
              </div>
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
