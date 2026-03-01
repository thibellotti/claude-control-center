import React, { useState } from 'react';
import { SearchIcon, ChevronLeftIcon, ChevronDownIcon } from '../icons';

export interface TopBarProps {
  pageTitle: string;
  onOpenSearch?: () => void;
  activeProject?: {
    name: string;
    client: string | null;
    path: string;
    mode: string;
  } | null;
  onBack?: () => void;
  recentProjects?: Array<{ name: string; path: string; client: string | null }>;
  onSwitchProject?: (path: string) => void;
}

export default function TopBar({
  pageTitle,
  onOpenSearch,
  activeProject,
  onBack,
  recentProjects,
  onSwitchProject,
}: TopBarProps) {
  const [showSwitcher, setShowSwitcher] = useState(false);

  return (
    <header className="drag-region flex items-center justify-between h-[52px] px-6 border-b border-border-subtle bg-surface-1 shrink-0">
      {activeProject ? (
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="no-drag p-1 rounded text-text-tertiary hover:text-text-primary transition-colors"
            title="Back to Dashboard"
          >
            <ChevronLeftIcon size={14} />
          </button>
          <span className="text-sm font-medium text-text-primary">{activeProject.name}</span>
          {activeProject.client && (
            <span className="px-1.5 py-0.5 rounded bg-surface-2 text-micro text-text-tertiary">
              {activeProject.client}
            </span>
          )}
          <span className={`px-1.5 py-0.5 rounded text-micro font-medium ${
            activeProject.mode.includes('skip')
              ? 'bg-feedback-warning/10 text-feedback-warning'
              : 'bg-accent/10 text-accent'
          }`}>
            {activeProject.mode.includes('skip') ? 'Autopilot' : 'Claude'}
          </span>
        </div>
      ) : (
        <span className="text-sm font-medium text-text-secondary">{pageTitle}</span>
      )}

      <div className="flex items-center gap-2">
        {recentProjects && recentProjects.length > 0 && (
          <div className="relative no-drag">
            <button
              onClick={() => setShowSwitcher(!showSwitcher)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-button text-xs text-text-tertiary hover:text-text-secondary hover:bg-surface-2 transition-colors"
              title="Switch project"
            >
              <ChevronDownIcon size={12} />
              Switch
            </button>
            {showSwitcher && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSwitcher(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-surface-2 border border-border-subtle rounded-card shadow-xl py-1 min-w-[220px] max-h-[300px] overflow-y-auto">
                  {recentProjects.map((p) => (
                    <button
                      key={p.path}
                      onClick={() => { onSwitchProject?.(p.path); setShowSwitcher(false); }}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors ${
                        activeProject?.path === p.path ? 'bg-surface-3 text-text-primary' : ''
                      }`}
                    >
                      <span className="truncate flex-1 text-left">{p.name}</span>
                      {p.client && (
                        <span className="text-micro text-text-tertiary shrink-0">{p.client}</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <button
          onClick={onOpenSearch}
          aria-label="Search projects (Cmd+K)"
          className="no-drag flex items-center gap-2 px-3 py-1.5 rounded-button bg-surface-2 border border-border-subtle text-text-tertiary hover:text-text-secondary hover:border-border-default transition-colors text-xs"
        >
          <SearchIcon />
          <span>Search</span>
          <kbd className="ml-1 px-1.5 py-0.5 rounded bg-surface-3 border border-border-subtle text-micro font-mono">
            {'\u2318'}K
          </kbd>
        </button>
      </div>
    </header>
  );
}
