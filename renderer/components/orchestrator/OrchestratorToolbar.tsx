import React, { useState } from 'react';
import type { LayoutPreset } from '../../../shared/types';
import { PlusIcon, TerminalIcon, FeedIcon, LayersIcon, EyeIcon, ClaudeIcon } from '../icons';

interface OrchestratorToolbarProps {
  layout: LayoutPreset;
  cellCount: number;
  onSetLayout: (preset: LayoutPreset) => void;
  onAddTerminal: (command?: string) => void;
  onAddFeed: () => void;
  onAddTaskBoard: () => void;
  onAddPreview: () => void;
}

const layoutOptions: { id: LayoutPreset; label: string; icon: string }[] = [
  { id: 'focus', label: 'Focus', icon: '[ ]' },
  { id: 'split', label: 'Split', icon: '[ | ]' },
  { id: 'quad', label: 'Quad', icon: '[+]' },
  { id: 'main-side', label: 'Main+Side', icon: '[|:]' },
];

export default function OrchestratorToolbar({
  layout,
  cellCount,
  onSetLayout,
  onAddTerminal,
  onAddFeed,
  onAddTaskBoard,
  onAddPreview,
}: OrchestratorToolbarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface-0 shrink-0">
      {/* Left: Layout selector */}
      <div className="flex items-center gap-1">
        {layoutOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSetLayout(opt.id)}
            className={`px-2.5 py-1 rounded-button text-xs font-mono transition-colors ${
              layout === opt.id
                ? 'bg-surface-3 text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2'
            }`}
            title={opt.label}
          >
            {opt.icon}
          </button>
        ))}
      </div>

      {/* Center: Info */}
      <span className="text-micro text-text-tertiary">
        {cellCount} {cellCount === 1 ? 'cell' : 'cells'}
      </span>

      {/* Right: Add button */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          <PlusIcon size={12} />
          Add
        </button>

        {showAddMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 bg-surface-2 border border-border-subtle rounded-card shadow-xl py-1 min-w-[200px]">
              <button
                onClick={() => { onAddTerminal(); setShowAddMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <TerminalIcon size={14} />
                Shell Terminal
              </button>
              <button
                onClick={() => { onAddTerminal('claude'); setShowAddMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <ClaudeIcon size={14} />
                Claude Session
              </button>
              <button
                onClick={() => { onAddTerminal('claude --dangerously-skip-permissions'); setShowAddMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <ClaudeIcon size={14} />
                <span>Claude <span className="text-feedback-warning">Autopilot</span></span>
              </button>
              <div className="border-t border-border-subtle my-1" />
              <button
                onClick={() => { onAddFeed(); setShowAddMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <FeedIcon size={14} />
                Activity Feed
              </button>
              <button
                onClick={() => { onAddTaskBoard(); setShowAddMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <LayersIcon size={14} />
                Task Board
              </button>
              <button
                onClick={() => { onAddPreview(); setShowAddMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <EyeIcon size={14} />
                Preview
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
