import React from 'react';
import type { EnhancedPreviewState } from '../../../shared/types';
import type { ViewportState } from '../../hooks/usePreview';
import { PlayIcon, StopIcon, RefreshIcon, DesktopIcon, TabletIcon, MobileIcon, ExternalLinkIcon, ConsoleIcon } from '../icons';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PreviewToolbarProps {
  state: EnhancedPreviewState;
  viewport: ViewportState;
  showConsole: boolean;
  consoleCount: number;
  onStart: () => void;
  onStop: () => void;
  onRefresh: () => void;
  onViewportChange: (mode: string, width?: number) => void;
  onToggleConsole: () => void;
  onOpenBrowser: () => void;
}

// ---------------------------------------------------------------------------
// Status dot color helper
// ---------------------------------------------------------------------------

function statusDotClass(status: EnhancedPreviewState['status']): string {
  switch (status) {
    case 'idle':
      return 'bg-text-tertiary';
    case 'detecting':
    case 'installing':
    case 'starting':
      return 'bg-status-dirty';
    case 'ready':
      return 'bg-status-active';
    case 'error':
      return 'bg-feedback-error';
    default:
      return 'bg-text-tertiary';
  }
}

// ---------------------------------------------------------------------------
// URL / status label
// ---------------------------------------------------------------------------

function urlLabel(state: EnhancedPreviewState): string {
  if (state.status === 'ready' && state.url) return state.url;
  if (state.status === 'idle') return 'Not running';
  if (state.status === 'detecting') return 'Detecting framework...';
  if (state.status === 'installing') return 'Installing dependencies...';
  if (state.status === 'starting') return 'Starting server...';
  if (state.status === 'error') return state.error ?? 'Error';
  return 'Not running';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PreviewToolbar({
  state,
  viewport,
  showConsole,
  consoleCount,
  onStart,
  onStop,
  onRefresh,
  onViewportChange,
  onToggleConsole,
  onOpenBrowser,
}: PreviewToolbarProps) {
  const isRunning = state.status !== 'idle' && state.status !== 'error';
  const isReady = state.status === 'ready';

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-surface-1 border-b border-border-subtle shrink-0">
      {/* Left: status dot + start/stop */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotClass(state.status)}`} />

        {/* Start / Stop button */}
        <button
          onClick={isRunning ? onStop : onStart}
          className={`flex items-center justify-center w-7 h-7 rounded-button transition-colors ${
            isRunning
              ? 'bg-feedback-error-muted text-feedback-error hover:bg-feedback-error-muted'
              : 'bg-feedback-success-muted text-feedback-success hover:bg-feedback-success-muted'
          }`}
          title={isRunning ? 'Stop dev server' : 'Start dev server'}
        >
          {isRunning ? <StopIcon /> : <PlayIcon />}
        </button>
      </div>

      {/* Center: URL display */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center h-7 px-3 rounded-button bg-surface-2 border border-border-subtle">
          <span className="text-xs font-mono text-text-tertiary truncate">
            {urlLabel(state)}
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={!isReady}
          className="flex items-center justify-center w-7 h-7 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Refresh preview"
        >
          <RefreshIcon />
        </button>

        {/* Separator */}
        <div className="w-px h-4 bg-border-subtle mx-0.5" />

        {/* Viewport presets */}
        {(['desktop', 'tablet', 'mobile'] as const).map((v) => (
          <button
            key={v}
            onClick={() => onViewportChange(v)}
            className={`flex items-center justify-center w-7 h-7 rounded-button transition-colors ${
              viewport.mode === v
                ? 'text-accent bg-accent/10'
                : 'text-text-tertiary hover:text-text-primary hover:bg-surface-2'
            }`}
            title={`${v.charAt(0).toUpperCase() + v.slice(1)} viewport`}
          >
            {v === 'desktop' && <DesktopIcon active={viewport.mode === v} size={16} />}
            {v === 'tablet' && <TabletIcon active={viewport.mode === v} size={16} />}
            {v === 'mobile' && <MobileIcon active={viewport.mode === v} size={16} />}
          </button>
        ))}

        {/* Separator */}
        <div className="w-px h-4 bg-border-subtle mx-0.5" />

        {/* Console toggle */}
        <button
          onClick={onToggleConsole}
          className={`flex items-center justify-center w-7 h-7 rounded-button transition-colors relative ${
            showConsole
              ? 'text-accent bg-accent/10'
              : 'text-text-tertiary hover:text-text-primary hover:bg-surface-2'
          }`}
          title="Toggle console"
        >
          <ConsoleIcon />
          {consoleCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center px-0.5 rounded-full bg-accent text-[9px] font-bold text-white leading-none">
              {consoleCount > 99 ? '99+' : consoleCount}
            </span>
          )}
        </button>

        {/* Open in browser */}
        <button
          onClick={onOpenBrowser}
          disabled={!isReady}
          className="flex items-center justify-center w-7 h-7 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Open in browser"
        >
          <ExternalLinkIcon />
        </button>
      </div>
    </div>
  );
}
