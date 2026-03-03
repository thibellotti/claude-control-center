import React from 'react';
import type { SessionSearchResult } from '../../../shared/types';
import { CloseIcon, SearchIcon } from '../icons';

interface SearchResultsPanelProps {
  result: SessionSearchResult;
  query: string;
  onClose: () => void;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;

  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-accent/30 text-text-primary rounded-sm px-px">
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SearchResultsPanel({ result, query, onClose }: SearchResultsPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <SearchIcon size={12} />
          <span className="text-xs font-medium text-text-primary truncate">
            {result.projectName}
          </span>
          <span className="text-micro text-text-tertiary shrink-0">
            {result.totalMatches} match{result.totalMatches !== 1 ? 'es' : ''}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-button text-text-tertiary hover:text-text-secondary transition-colors shrink-0"
        >
          <CloseIcon size={12} />
        </button>
      </div>

      {/* Session info */}
      <div className="px-3 py-2 border-b border-border-subtle/50 bg-surface-1 shrink-0">
        {result.command && (
          <p className="text-micro font-mono text-text-secondary truncate mb-0.5">
            {result.command}
          </p>
        )}
        <p className="text-micro text-text-tertiary">
          {formatTime(result.timestamp)}
        </p>
      </div>

      {/* Matches */}
      <div className="flex-1 overflow-y-auto">
        {result.matches.map((match, idx) => (
          <div
            key={`${match.lineNumber}-${idx}`}
            className="border-b border-border-subtle/30 px-3 py-2"
          >
            {/* Line number badge */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-micro font-mono text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded">
                L{match.lineNumber}
              </span>
            </div>

            {/* Context lines before */}
            {match.context
              .filter((_, ci) => ci < 2)
              .map((line, ci) => (
                <p
                  key={`ctx-before-${ci}`}
                  className="text-micro font-mono text-text-tertiary leading-relaxed whitespace-pre-wrap break-all"
                >
                  {line}
                </p>
              ))}

            {/* Matching line */}
            <p className="text-micro font-mono text-text-primary leading-relaxed whitespace-pre-wrap break-all bg-surface-1 -mx-1 px-1 rounded">
              {highlightMatch(match.content, query)}
            </p>

            {/* Context lines after */}
            {match.context
              .filter((_, ci) => ci >= 2)
              .map((line, ci) => (
                <p
                  key={`ctx-after-${ci}`}
                  className="text-micro font-mono text-text-tertiary leading-relaxed whitespace-pre-wrap break-all"
                >
                  {line}
                </p>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
