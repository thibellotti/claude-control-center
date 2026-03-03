import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon, TerminalIcon, EyeIcon, ClaudeIcon, SearchIcon, CloseIcon, DiffIcon, BranchIcon, KanbanIcon } from '../icons';
import { useSessionSearch } from '../../hooks/useSessionSearch';
import { useProviders } from '../../hooks/useProviders';
import type { SessionSearchResult } from '../../../shared/types';

interface OrchestratorToolbarProps {
  projectName: string | null;
  modeBadge: string | null;
  onAddTerminal: (command?: string) => void;
  onAddPreview: (url?: string) => void;
  onAddDiff: () => void;
  onAddWorktreeAgent: () => void;
  onAddKanban: () => void;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  onSearchResultSelect?: (result: SessionSearchResult) => void;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function OrchestratorToolbar({
  projectName,
  modeBadge,
  onAddTerminal,
  onAddPreview,
  onAddDiff,
  onAddWorktreeAgent,
  onAddKanban,
  drawerOpen,
  onToggleDrawer,
  onSearchResultSelect,
}: OrchestratorToolbarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { results, searching, query, search, clear } = useSessionSearch();
  const { providers } = useProviders();
  const enabledProviders = providers.filter((p) => p.enabled);

  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchExpanded]);

  const handleSearchClose = () => {
    setSearchExpanded(false);
    clear();
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface-0 shrink-0">
      {/* Left: Project name + mode badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-primary">
          {projectName || 'Orchestrator'}
        </span>
        {modeBadge && (
          <span className={`px-1 py-1 rounded text-micro font-medium ${
            modeBadge === 'Autopilot'
              ? 'bg-feedback-warning/10 text-feedback-warning'
              : 'bg-accent/10 text-accent'
          }`}>
            {modeBadge}
          </span>
        )}
      </div>

      {/* Right: Search + Add + Drawer toggle */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          {searchExpanded ? (
            <div className="flex items-center gap-1">
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => search(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') handleSearchClose(); }}
                placeholder="Search session output..."
                className="w-[220px] px-2 py-1 rounded-button text-xs font-mono bg-surface-1 border border-border-subtle text-text-primary outline-none focus:border-accent transition-all"
              />
              <button
                onClick={handleSearchClose}
                className="p-1 rounded-button text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <CloseIcon size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchExpanded(true)}
              className="p-1.5 rounded-button text-text-tertiary hover:text-text-secondary hover:bg-surface-2 transition-colors"
              title="Search session history"
            >
              <SearchIcon size={14} />
            </button>
          )}

          {/* Search results dropdown */}
          {searchExpanded && query.trim() && (
            <>
              <div className="fixed inset-0 z-40" onClick={handleSearchClose} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-surface-2 border border-border-subtle rounded-card shadow-xl min-w-[360px] max-h-[400px] overflow-y-auto">
                {searching ? (
                  <div className="flex items-center justify-center py-6">
                    <span className="text-xs text-text-tertiary">Searching...</span>
                  </div>
                ) : results.length === 0 ? (
                  <div className="flex items-center justify-center py-6">
                    <span className="text-xs text-text-tertiary">No matches found</span>
                  </div>
                ) : (
                  results.map((result) => (
                    <button
                      key={result.sessionId}
                      onClick={() => {
                        onSearchResultSelect?.(result);
                        handleSearchClose();
                      }}
                      className="block w-full text-left px-3 py-2 border-b border-border-subtle/50 hover:bg-surface-3 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-text-primary truncate max-w-[200px]">
                          {result.projectName}
                        </span>
                        <span className="text-micro text-text-tertiary shrink-0 ml-2">
                          {formatTimestamp(result.timestamp)}
                        </span>
                      </div>
                      {result.command && (
                        <p className="text-micro font-mono text-text-tertiary truncate mb-1">
                          {result.command}
                        </p>
                      )}
                      <p className="text-micro text-accent">
                        {result.totalMatches} match{result.totalMatches !== 1 ? 'es' : ''}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Add button */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1 px-3 py-1 rounded-button text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover transition-colors"
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
                {enabledProviders.map((provider) => (
                  <React.Fragment key={provider.id}>
                    <button
                      onClick={() => {
                        const exec = provider.executablePath || provider.executable;
                        onAddTerminal(exec);
                        setShowAddMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                    >
                      <ClaudeIcon size={14} />
                      {provider.name} Session
                    </button>
                    {provider.autopilotArgs.length > 0 && (
                      <button
                        onClick={() => {
                          const exec = provider.executablePath || provider.executable;
                          const autopilotCmd = `${exec} ${provider.autopilotArgs.join(' ')}`;
                          onAddTerminal(autopilotCmd);
                          setShowAddMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                      >
                        <ClaudeIcon size={14} />
                        <span>{provider.name} <span className="text-feedback-warning">Autopilot</span></span>
                      </button>
                    )}
                  </React.Fragment>
                ))}
                {enabledProviders.length === 0 && (
                  <>
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
                  </>
                )}
                <div className="border-t border-border-subtle my-1" />
                <button
                  onClick={() => { onAddPreview(); setShowAddMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                >
                  <EyeIcon size={14} />
                  Preview (localhost)
                </button>
                <button
                  onClick={() => { setShowAddMenu(false); setShowUrlInput(true); setUrlValue(''); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                >
                  <EyeIcon size={14} />
                  Preview (URL)
                </button>
                <div className="border-t border-border-subtle my-1" />
                <button
                  onClick={() => { onAddDiff(); setShowAddMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                >
                  <DiffIcon size={14} />
                  Diff Viewer
                </button>
                <div className="border-t border-border-subtle my-1" />
                <button
                  onClick={() => { onAddWorktreeAgent(); setShowAddMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                >
                  <BranchIcon size={14} />
                  Spawn Worktree Agent
                </button>
                <button
                  onClick={() => { onAddKanban(); setShowAddMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                >
                  <KanbanIcon size={14} />
                  Kanban Board
                </button>
              </div>
            </>
          )}
        </div>

        {/* URL input popover */}
        {showUrlInput && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowUrlInput(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 bg-surface-2 border border-border-subtle rounded-card shadow-xl p-3 min-w-[320px]">
              <p className="text-xs font-medium text-text-secondary mb-2">Preview URL</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  let url = urlValue.trim();
                  if (!url) return;
                  if (!url.startsWith('http')) url = `https://${url}`;
                  onAddPreview(url);
                  setShowUrlInput(false);
                }}
              >
                <input
                  autoFocus
                  type="text"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  placeholder="urbaniks.com.br"
                  className="w-full px-3 py-1.5 rounded-button text-xs font-mono bg-surface-0 border border-border-subtle text-text-primary outline-none focus:border-accent mb-2"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(false)}
                    className="px-3 py-1 rounded-button text-xs font-medium text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-button text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover transition-colors"
                  >
                    Open
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

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
