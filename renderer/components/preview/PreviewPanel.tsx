import React, { useState } from 'react';
import { usePreview, VIEWPORT_WIDTHS } from '../../hooks/usePreview';
import PreviewToolbar from './PreviewToolbar';

interface PreviewPanelProps {
  projectPath: string;
}

function PlayCircleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 11v10l8-5-8-5z" fill="currentColor" />
    </svg>
  );
}

function ConsoleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 4l2.5 2L2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 8h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
    >
      <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="animate-bounce [animation-delay:0ms] w-1 h-1 rounded-full bg-text-tertiary inline-block" />
      <span className="animate-bounce [animation-delay:150ms] w-1 h-1 rounded-full bg-text-tertiary inline-block" />
      <span className="animate-bounce [animation-delay:300ms] w-1 h-1 rounded-full bg-text-tertiary inline-block" />
    </span>
  );
}

export default function PreviewPanel({ projectPath }: PreviewPanelProps) {
  const {
    state,
    viewport,
    setViewport,
    isStarting,
    iframeKey,
    start,
    stop,
    refresh,
  } = usePreview(projectPath);

  const [showConsole, setShowConsole] = useState(false);

  const handleOpenExternal = () => {
    if (state.url) {
      window.open(state.url, '_blank');
    }
  };

  const viewportWidth = VIEWPORT_WIDTHS[viewport];

  return (
    <div className="flex flex-col h-[600px] border border-border-subtle rounded-lg overflow-hidden mt-4">
      {/* Toolbar */}
      <PreviewToolbar
        url={state.url}
        isRunning={state.isRunning}
        isStarting={isStarting}
        viewport={viewport}
        onViewportChange={setViewport}
        onRefresh={refresh}
        onStart={start}
        onStop={stop}
        onOpenExternal={handleOpenExternal}
      />

      {/* Main content area */}
      <div className="flex-1 bg-surface-0 overflow-hidden relative">
        {/* Not running - empty state */}
        {!state.isRunning && !isStarting && (
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
              Start Dev Server
            </button>
            {state.error && (
              <p className="text-xs text-red-400 mt-2 max-w-md text-center">{state.error}</p>
            )}
          </div>
        )}

        {/* Starting / waiting for URL */}
        {(isStarting || (state.isRunning && !state.url)) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="text-text-tertiary">
              <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm text-text-secondary flex items-center gap-2">
                Starting server <LoadingDots />
              </p>
            </div>
            {state.error && (
              <p className="text-xs text-yellow-400 mt-1 max-w-md text-center">{state.error}</p>
            )}
            {/* Show recent output while starting */}
            {state.output.length > 0 && (
              <div className="w-full max-w-lg mt-4 px-4">
                <div className="bg-surface-2 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <pre className="text-[10px] font-mono text-text-tertiary leading-relaxed whitespace-pre-wrap break-all">
                    {state.output.slice(-10).join('')}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Running with URL - show iframe */}
        {state.isRunning && state.url && !isStarting && (
          <div className="absolute inset-0 flex justify-center overflow-auto bg-surface-2">
            <div
              className="h-full transition-[width] duration-300 ease-in-out bg-white"
              style={{ width: viewportWidth, maxWidth: '100%' }}
            >
              <iframe
                key={iframeKey}
                src={state.url}
                className="w-full h-full border-0"
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            </div>
          </div>
        )}
      </div>

      {/* Console toggle and output log */}
      {state.isRunning && (
        <div className="border-t border-border-subtle">
          <button
            onClick={() => setShowConsole(!showConsole)}
            className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors bg-surface-1"
          >
            <ConsoleIcon />
            <span className="font-medium">Console</span>
            {state.output.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-surface-3 text-[10px] font-medium">
                {state.output.length}
              </span>
            )}
            <span className="ml-auto">
              <ChevronIcon expanded={showConsole} />
            </span>
          </button>

          {showConsole && (
            <div className="bg-surface-2 px-3 py-2 max-h-40 overflow-y-auto">
              {state.output.length === 0 ? (
                <p className="text-[10px] font-mono text-text-tertiary">No output yet.</p>
              ) : (
                <pre className="text-[10px] font-mono text-text-tertiary leading-relaxed whitespace-pre-wrap break-all">
                  {state.output.slice(-20).join('')}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
