import React, { useEffect, useRef } from 'react';
import type { FeedEntry } from '../../hooks/useTerminal';

interface LiveFeedProps {
  entries: FeedEntry[];
  onClear: () => void;
}

function shortenPath(path: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || '~';
  if (path.startsWith(home)) {
    return '~' + path.slice(home.length);
  }
  return path;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getTypeColor(type: FeedEntry['type']): string {
  switch (type) {
    case 'user': return 'text-accent';
    case 'assistant': return 'text-text-primary';
    case 'tool_use': return 'text-status-active';
    case 'tool_result': return 'text-text-secondary';
    case 'system': return 'text-text-tertiary';
    default: return 'text-text-secondary';
  }
}

function getTypeLabel(type: FeedEntry['type']): string {
  switch (type) {
    case 'user': return 'USR';
    case 'assistant': return 'CLD';
    case 'tool_use': return 'RUN';
    case 'tool_result': return 'RES';
    case 'system': return 'SYS';
    default: return '???';
  }
}

export default function LiveFeed({ entries, onClear }: LiveFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary text-xs">
        <div className="text-center">
          <p className="mb-1">Waiting for activity...</p>
          <p className="text-micro">Activity from active Claude sessions will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Feed header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-status-active" />
          </span>
          <span className="text-xs font-medium text-text-secondary">
            Live Feed ({entries.length})
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-micro text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Feed entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        {entries.map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            className="flex items-start gap-2 px-3 py-1.5 hover:bg-surface-2 transition-colors border-b border-border-subtle/30"
          >
            <span className="text-micro font-mono text-text-tertiary shrink-0 mt-0.5 w-[56px]">
              {formatTime(entry.timestamp)}
            </span>
            <span className={`text-micro font-mono font-semibold shrink-0 mt-0.5 w-[26px] ${getTypeColor(entry.type)}`}>
              {getTypeLabel(entry.type)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-text-primary leading-relaxed break-words">
                {entry.summary}
              </p>
              {entry.projectPath && (
                <p className="text-micro text-text-tertiary font-mono truncate mt-0.5">
                  {shortenPath(entry.projectPath)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
