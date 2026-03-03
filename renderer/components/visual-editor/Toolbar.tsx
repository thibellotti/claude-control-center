import React from 'react';
import {
  ChevronLeftIcon,
  DesktopIcon,
  TabletIcon,
  MobileIcon,
} from '../icons';

interface ToolbarProps {
  viewport: 'desktop' | 'tablet' | 'mobile';
  canUndo: boolean;
  canRedo: boolean;
  checkpointCount: number;
  onViewportChange: (preset: 'desktop' | 'tablet' | 'mobile') => void;
  onUndo: () => void;
  onRedo: () => void;
  onExit: () => void;
}

// Simple undo/redo icons inline (not in the icons module yet)
function UndoIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M3 5h5a3 3 0 0 1 0 6H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 3L3 5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RedoIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M11 5H6a3 3 0 0 0 0 6h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 3l2 2-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Toolbar({
  viewport,
  canUndo,
  canRedo,
  checkpointCount,
  onViewportChange,
  onUndo,
  onRedo,
  onExit,
}: ToolbarProps) {
  return (
    <div className="drag-region flex items-center justify-between px-4 py-2 pl-[72px] bg-surface-1 border-b border-border-subtle shrink-0">
      {/* Left: Back button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExit}
          className="flex items-center gap-1 px-2 py-1 rounded-button text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
        >
          <ChevronLeftIcon size={14} />
          <span>Back</span>
        </button>

        <div className="w-px h-4 bg-border-subtle mx-1" />

        <span className="text-micro font-medium text-accent uppercase tracking-wider">Visual Editor</span>
      </div>

      {/* Center: Viewport presets */}
      <div className="flex items-center gap-1">
        {(['desktop', 'tablet', 'mobile'] as const).map((v) => (
          <button
            key={v}
            onClick={() => onViewportChange(v)}
            className={`flex items-center justify-center w-8 h-8 rounded-button transition-colors ${
              viewport === v
                ? 'text-accent bg-accent/10'
                : 'text-text-tertiary hover:text-text-primary hover:bg-surface-2'
            }`}
            title={`${v.charAt(0).toUpperCase() + v.slice(1)} viewport`}
          >
            {v === 'desktop' && <DesktopIcon active={viewport === v} size={16} />}
            {v === 'tablet' && <TabletIcon active={viewport === v} size={16} />}
            {v === 'mobile' && <MobileIcon active={viewport === v} size={16} />}
          </button>
        ))}
      </div>

      {/* Right: Undo/Redo + checkpoint count */}
      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center justify-center w-8 h-8 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo (restore previous state)"
        >
          <UndoIcon />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="flex items-center justify-center w-8 h-8 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo (re-apply change)"
        >
          <RedoIcon />
        </button>

        {checkpointCount > 0 && (
          <span className="flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-surface-2 text-micro font-medium text-text-tertiary">
            {checkpointCount}
          </span>
        )}
      </div>
    </div>
  );
}
