import React from 'react';
import type { Viewport } from '../../hooks/usePreview';

interface PreviewToolbarProps {
  url: string | null;
  isRunning: boolean;
  isStarting: boolean;
  viewport: Viewport;
  onViewportChange: (v: Viewport) => void;
  onRefresh: () => void;
  onStart: () => void;
  onStop: () => void;
  onOpenExternal: () => void;
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

export default function PreviewToolbar({
  url,
  isRunning,
  isStarting,
  viewport,
  onViewportChange,
  onRefresh,
  onStart,
  onStop,
  onOpenExternal,
}: PreviewToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-surface-1 border-b border-border-subtle">
      {/* Start / Stop toggle */}
      <button
        onClick={isRunning ? onStop : onStart}
        disabled={isStarting}
        className={`flex items-center justify-center w-7 h-7 rounded-button transition-colors shrink-0 ${
          isRunning
            ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
            : 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
        } ${isStarting ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isRunning ? 'Stop dev server' : 'Start dev server'}
      >
        {isRunning ? <StopIcon /> : <PlayIcon />}
      </button>

      {/* URL display */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center h-7 px-3 rounded-button bg-surface-2 border border-border-subtle">
          <span className="text-xs font-mono text-text-tertiary truncate">
            {url || 'Not running'}
          </span>
        </div>
      </div>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        disabled={!url}
        className="flex items-center justify-center w-7 h-7 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        title="Refresh preview"
      >
        <RefreshIcon />
      </button>

      {/* Separator */}
      <div className="w-px h-4 bg-border-subtle shrink-0" />

      {/* Viewport presets */}
      <div className="flex items-center gap-0.5 shrink-0">
        {(['desktop', 'tablet', 'mobile'] as Viewport[]).map((v) => (
          <button
            key={v}
            onClick={() => onViewportChange(v)}
            className={`flex items-center justify-center w-7 h-7 rounded-button transition-colors ${
              viewport === v
                ? 'text-accent bg-accent-muted'
                : 'text-text-tertiary hover:text-text-primary hover:bg-surface-2'
            }`}
            title={`${v.charAt(0).toUpperCase() + v.slice(1)} viewport`}
          >
            {v === 'desktop' && <DesktopIcon active={viewport === v} />}
            {v === 'tablet' && <TabletIcon active={viewport === v} />}
            {v === 'mobile' && <MobileIcon active={viewport === v} />}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-border-subtle shrink-0" />

      {/* Open in browser */}
      <button
        onClick={onOpenExternal}
        disabled={!url}
        className="flex items-center justify-center w-7 h-7 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        title="Open in browser"
      >
        <ExternalLinkIcon />
      </button>
    </div>
  );
}
