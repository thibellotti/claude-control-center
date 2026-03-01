import React, { useState } from 'react';
import { PlusIcon, TerminalIcon, EyeIcon, ClaudeIcon } from '../icons';

interface OrchestratorToolbarProps {
  projectName: string | null;
  modeBadge: string | null;
  onAddTerminal: (command?: string) => void;
  onAddPreview: () => void;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}

export default function OrchestratorToolbar({
  projectName,
  modeBadge,
  onAddTerminal,
  onAddPreview,
  drawerOpen,
  onToggleDrawer,
}: OrchestratorToolbarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface-0 shrink-0">
      {/* Left: Project name + mode badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-primary">
          {projectName || 'Orchestrator'}
        </span>
        {modeBadge && (
          <span className={`px-1.5 py-0.5 rounded text-micro font-medium ${
            modeBadge === 'Autopilot'
              ? 'bg-feedback-warning/10 text-feedback-warning'
              : 'bg-accent/10 text-accent'
          }`}>
            {modeBadge}
          </span>
        )}
      </div>

      {/* Right: Add + Drawer toggle */}
      <div className="flex items-center gap-2">
        {/* Add button */}
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

        {/* Drawer toggle */}
        <button
          onClick={onToggleDrawer}
          className={`p-1.5 rounded-button transition-colors ${
            drawerOpen
              ? 'bg-surface-3 text-text-primary'
              : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2'
          }`}
          title={drawerOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="2" width="14" height="12" rx="2" />
            <line x1="10" y1="2" x2="10" y2="14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
