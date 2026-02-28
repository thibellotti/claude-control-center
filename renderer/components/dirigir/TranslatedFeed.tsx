import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { TranslatedFeedEntry } from '../../../shared/types';

interface TranslatedFeedProps {
  entries: TranslatedFeedEntry[];
  isActive: boolean;
  onClear: () => void;
}

// --- Dot color map ---

const dotColorMap: Record<TranslatedFeedEntry['type'], string> = {
  action: 'bg-accent',
  info: 'bg-text-tertiary',
  progress: 'bg-status-active',
  complete: 'bg-feedback-success',
  error: 'bg-feedback-error',
};

// --- Timestamp formatter ---

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// --- Entry row ---

const FeedEntry = React.memo(function FeedEntry({
  entry,
}: {
  entry: TranslatedFeedEntry;
}) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => {
    if (entry.detail) setExpanded((prev) => !prev);
  }, [entry.detail]);

  return (
    <div>
      <div
        className="px-3 py-1.5 hover:bg-surface-2 transition-colors cursor-pointer flex items-center gap-2"
        onClick={toggle}
      >
        {/* Type dot */}
        <span
          className={`shrink-0 w-1.5 h-1.5 rounded-full ${dotColorMap[entry.type]}`}
        />

        {/* Message */}
        <span className="text-xs text-text-primary flex-1 truncate">
          {entry.message}
        </span>

        {/* Timestamp */}
        <span className="shrink-0 text-micro text-text-tertiary">
          {formatTime(entry.timestamp)}
        </span>
      </div>

      {/* Expandable detail */}
      {expanded && entry.detail && (
        <div className="mx-3 mb-1.5 text-micro font-mono text-text-tertiary bg-surface-2 p-2 rounded-button whitespace-pre-wrap break-all">
          {entry.detail}
        </div>
      )}
    </div>
  );
});

// --- Main component ---

const TranslatedFeed = React.memo(function TranslatedFeed({
  entries,
  isActive,
  onClear,
}: TranslatedFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      {isActive && (
        <div className="w-full bg-surface-2">
          <div className="h-0.5 bg-accent animate-pulse" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-primary">
            Activity
          </span>
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-feedback-success animate-pulse" />
          )}
          {entries.length > 0 && (
            <span className="text-micro text-text-tertiary">
              {entries.length}
            </span>
          )}
        </div>

        {entries.length > 0 && (
          <button
            onClick={onClear}
            className="text-micro text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Feed content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-1 px-4">
            <p className="text-xs text-text-tertiary">
              Waiting for activity...
            </p>
            <p className="text-micro text-text-tertiary text-center">
              Submit a request to see Claude build your changes live
            </p>
          </div>
        ) : (
          entries.map((entry, idx) => (
            <FeedEntry key={`${entry.requestId}-${idx}`} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
});

export default TranslatedFeed;
