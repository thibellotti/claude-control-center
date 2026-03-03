import React, { useEffect, useState } from 'react';
import { useClaudeMd } from '../../hooks/useClaudeMd';
import { ChevronDownIcon, SaveIcon, SpinnerIcon } from '../icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClaudeMdFile {
  path: string;
  projectPath: string;
  projectName: string;
  clientName: string | null;
  lastModified: number;
}

interface ClaudeMdManagerProps {
  projects: { path: string; name: string; client?: string | null }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isRootFile(file: ClaudeMdFile): boolean {
  return file.path === `${file.projectPath}/CLAUDE.md`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClaudeMdManager({ projects }: ClaudeMdManagerProps) {
  const {
    tree,
    loading,
    selectedFile,
    content,
    saving,
    scan,
    selectFile,
    setContent,
    saveContent,
  } = useClaudeMd();

  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (projects.length > 0) {
      scan(projects);
    }
  }, [projects, scan]);

  const toggleClient = (client: string) => {
    setCollapsedClients((prev) => {
      const next = new Set(prev);
      if (next.has(client)) next.delete(client);
      else next.add(client);
      return next;
    });
  };

  const clientNames = Object.keys(tree.byClient).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  const totalFiles = Object.values(tree.byClient).reduce((sum, files) => sum + files.length, 0);

  return (
    <div className="flex h-full">
      {/* ----------------------------------------------------------------- */}
      {/* Left panel — tree view */}
      {/* ----------------------------------------------------------------- */}
      <div className="w-1/3 min-w-[240px] max-w-[360px] border-r border-border-subtle flex flex-col bg-surface-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">CLAUDE.md Files</h2>
          <p className="text-micro text-text-tertiary mt-0.5">
            {loading ? 'Scanning...' : `${totalFiles} file${totalFiles !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <SpinnerIcon size={16} className="text-text-tertiary" />
            </div>
          )}

          {!loading && clientNames.length === 0 && (
            <div className="px-3 py-8 text-center text-micro text-text-tertiary">
              No CLAUDE.md files found in your projects.
            </div>
          )}

          {clientNames.map((client) => {
            const files = tree.byClient[client];
            const isCollapsed = collapsedClients.has(client);

            return (
              <div key={client}>
                {/* Client header */}
                <button
                  type="button"
                  onClick={() => toggleClient(client)}
                  className="flex items-center gap-1.5 w-full px-3 py-1.5 text-micro font-medium uppercase tracking-wider text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  <ChevronDownIcon
                    size={10}
                    className={`transition-transform duration-150 ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                  <span className="truncate">{client}</span>
                  <span className="ml-auto text-micro opacity-60">{files.length}</span>
                </button>

                {/* Files */}
                {!isCollapsed &&
                  files.map((file) => {
                    const isSelected = selectedFile?.path === file.path;
                    const isRoot = isRootFile(file);

                    return (
                      <button
                        key={file.path}
                        onClick={() => selectFile(file)}
                        className={`flex items-center gap-2 w-full pl-7 pr-3 py-1.5 rounded-button text-sm transition-colors ${
                          isSelected
                            ? 'bg-accent-muted text-accent'
                            : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                        }`}
                        title={file.path}
                      >
                        <span className="flex-1 text-left truncate">
                          {file.projectName}
                          {!isRoot && (
                            <span className="text-micro text-text-tertiary ml-1">/.claude</span>
                          )}
                        </span>
                        <span className="text-micro text-text-tertiary shrink-0">
                          {formatDate(file.lastModified)}
                        </span>
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Right panel — editor */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col bg-surface-0">
        {selectedFile ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-text-primary truncate">
                  {selectedFile.projectName}
                  <span className="text-text-tertiary font-normal"> / CLAUDE.md</span>
                </h3>
                <p className="text-micro text-text-tertiary truncate mt-0.5">
                  {selectedFile.path}
                </p>
              </div>
              <button
                onClick={saveContent}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 transition-colors shrink-0 ml-4"
              >
                {saving ? (
                  <SpinnerIcon size={12} />
                ) : (
                  <SaveIcon size={12} />
                )}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {/* Editor */}
            <div className="flex-1 p-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full bg-surface-1 border border-border-subtle rounded-lg p-4 text-sm font-mono text-text-primary resize-none focus:outline-none focus:border-accent/50 transition-colors placeholder:text-text-tertiary"
                placeholder="# CLAUDE.md"
                spellCheck={false}
              />
            </div>
          </>
        ) : (
          // Empty state
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-text-tertiary text-sm">
                Select a CLAUDE.md file to edit
              </div>
              <p className="text-micro text-text-tertiary mt-1 opacity-60">
                Project instructions for Claude Code
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
