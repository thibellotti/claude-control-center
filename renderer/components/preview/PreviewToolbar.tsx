import React from 'react';
import type { EnhancedPreviewState } from '../../../shared/types';
import type { ViewportState } from '../../hooks/usePreview';

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
// Inline SVG icons
// ---------------------------------------------------------------------------

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 1.5v9l7.5-4.5L3 1.5z" fill="currentColor" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M11.5 7A4.5 4.5 0 1 1 9.25 3M11.5 2v3h-3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DesktopIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="1.5" y="2" width="13" height="9" rx="1"
        stroke="currentColor"
        strokeWidth={active ? '1.5' : '1.2'}
      />
      <path d="M5.5 14h5M8 11v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function TabletIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="3" y="1.5" width="10" height="13" rx="1.5"
        stroke="currentColor"
        strokeWidth={active ? '1.5' : '1.2'}
      />
      <circle cx="8" cy="12.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function MobileIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="4" y="1.5" width="8" height="13" rx="1.5"
        stroke="currentColor"
        strokeWidth={active ? '1.5' : '1.2'}
      />
      <circle cx="8" cy="12.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10.5 7.5v3a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 2.5h3.5V6M6 8l5.5-5.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ConsoleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 5l2.5 2L3 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
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
      return 'bg-[#FF6B6B]';
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
              ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
              : 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
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
            {v === 'desktop' && <DesktopIcon active={viewport.mode === v} />}
            {v === 'tablet' && <TabletIcon active={viewport.mode === v} />}
            {v === 'mobile' && <MobileIcon active={viewport.mode === v} />}
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
