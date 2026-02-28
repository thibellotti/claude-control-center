import React, { useState } from 'react';
import { useHandoff, HandoffSections } from '../../hooks/useHandoff';
import MarkdownView from '../shared/MarkdownView';
import { PackageIcon, DownloadIcon, CopyIcon, CheckIcon } from '../icons';

interface HandoffExportProps {
  projectPath: string;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 border-2 border-border-subtle border-t-accent rounded-full animate-spin" />
    </div>
  );
}

const SECTION_LABELS: Record<keyof HandoffSections, string> = {
  overview: 'Overview',
  plan: 'Plan',
  git: 'Git Status',
  tasks: 'Tasks',
  fileTree: 'File Structure',
  techStack: 'Tech Stack',
  dependencies: 'Dependencies',
};

export default function HandoffExport({ projectPath }: HandoffExportProps) {
  const {
    handoff,
    isGenerating,
    isExporting,
    exportedPath,
    error,
    sections,
    preview,
    generate,
    exportHandoff,
    toggleSection,
  } = useHandoff(projectPath);

  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  }

  // Initial state -- no handoff generated yet
  if (!handoff && !isGenerating) {
    return (
      <div className="py-6 space-y-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 text-text-tertiary opacity-40">
            <PackageIcon />
          </div>
          <p className="text-sm text-text-secondary mb-1">
            Generate a shareable handoff package
          </p>
          <p className="text-xs text-text-tertiary mb-6">
            Aggregates CLAUDE.md, PLAN.md, git summary, tasks, file tree, and tech stack into a formatted document.
          </p>
          <button
            onClick={generate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            Generate Handoff
          </button>
          {error && (
            <p className="text-xs text-feedback-error mt-3">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (isGenerating) {
    return (
      <div className="py-6">
        <Spinner />
        <p className="text-xs text-text-tertiary text-center mt-2">
          Assembling project context...
        </p>
      </div>
    );
  }

  // Handoff generated -- show preview and export options
  return (
    <div className="py-6 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-text-primary">Handoff Preview</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportHandoff('markdown')}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            <DownloadIcon />
            {isExporting ? 'Saving...' : 'Save as HANDOFF.md'}
          </button>
          <button
            onClick={() => exportHandoff('json')}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default transition-colors disabled:opacity-50"
          >
            <DownloadIcon />
            Save as JSON
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
          >
            {copied ? (
              <>
                <CheckIcon />
                Copied
              </>
            ) : (
              <>
                <CopyIcon />
                Copy to clipboard
              </>
            )}
          </button>
          <button
            onClick={generate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default transition-colors disabled:opacity-50"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Success toast */}
      {exportedPath && (
        <div className="flex items-center gap-2 px-3 py-2 bg-feedback-success-muted border border-feedback-success-border rounded-md">
          <CheckIcon />
          <span className="text-xs text-feedback-success">
            Saved to {exportedPath}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-feedback-error-muted border border-feedback-error-border rounded-md">
          <span className="text-xs text-feedback-error">{error}</span>
        </div>
      )}

      {/* Section toggles */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-text-tertiary">Sections:</span>
        {(Object.keys(SECTION_LABELS) as (keyof HandoffSections)[]).map((key) => (
          <label
            key={key}
            className="flex items-center gap-1.5 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={sections[key]}
              onChange={() => toggleSection(key)}
              className="w-3.5 h-3.5 rounded border-border-subtle bg-surface-2 text-accent accent-[var(--color-accent)] focus:ring-0 focus:ring-offset-0"
            />
            <span className="text-xs text-text-secondary">{SECTION_LABELS[key]}</span>
          </label>
        ))}
      </div>

      {/* Preview */}
      <div className="bg-surface-1 border border-border-subtle rounded-lg p-6 max-h-[600px] overflow-y-auto">
        <MarkdownView content={preview} />
      </div>
    </div>
  );
}
