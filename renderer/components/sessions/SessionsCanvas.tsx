import React, { useEffect, useMemo } from 'react';
import type { ActiveSession } from '../../../shared/types';
import type { FeedEntry } from '../../hooks/useTerminal';
import { useActiveSessions } from '../../hooks/useSessions';
import { useLiveFeed } from '../../hooks/useTerminal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function shortenPath(path: string): string {
  const parts = path.split('/');
  if (parts.length > 3) {
    return '~/' + parts.slice(-2).join('/');
  }
  return path;
}

function getDisplayName(session: ActiveSession): string {
  if (session.sessionLabel) return session.sessionLabel;
  return session.projectName;
}

function elapsed(startTime: number): string {
  const secs = Math.floor((Date.now() - startTime) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

// ---------------------------------------------------------------------------
// Session Card
// ---------------------------------------------------------------------------

interface SessionCardProps {
  session: ActiveSession;
  entries: FeedEntry[];
}

function SessionCard({ session, entries }: SessionCardProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  const displayName = getDisplayName(session);
  const recentEntries = entries.slice(-50);

  return (
    <div className="flex flex-col bg-surface-1 border border-border-subtle rounded-card overflow-hidden h-full">
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle shrink-0">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-status-active" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-primary truncate">{displayName}</p>
          <p className="text-micro text-text-tertiary font-mono truncate">
            {shortenPath(session.projectPath)} &middot; PID {session.pid}
          </p>
        </div>
        <span className="text-micro text-text-tertiary font-mono shrink-0">
          {elapsed(session.startTime)}
        </span>
      </div>

      {/* Feed area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {recentEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-micro text-text-tertiary">Waiting for activity...</p>
          </div>
        ) : (
          <div>
            {recentEntries.map((entry, i) => (
              <div
                key={`${entry.timestamp}-${i}`}
                className="flex items-start gap-1.5 px-2.5 py-1 hover:bg-surface-2/50 transition-colors border-b border-border-subtle/20"
              >
                <span className="text-micro font-mono text-text-tertiary shrink-0 mt-px w-[50px]">
                  {formatTime(entry.timestamp)}
                </span>
                <span className={`text-micro font-mono font-bold shrink-0 mt-px w-[22px] ${getTypeColor(entry.type)}`}>
                  {getTypeLabel(entry.type)}
                </span>
                <p className="text-micro text-text-secondary leading-snug break-words min-w-0">
                  {entry.summary}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card footer — status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border-subtle bg-surface-0 shrink-0">
        <span className="text-micro text-text-tertiary">
          {recentEntries.length} events
        </span>
        <span className="text-micro text-status-active font-medium">Active</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-3 max-w-sm">
        <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mx-auto">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-text-tertiary">
            <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-text-secondary">No active sessions</p>
          <p className="text-xs text-text-tertiary mt-1">
            Start Claude Code in a project terminal to see live session activity here
          </p>
        </div>
        <div className="text-micro text-text-tertiary font-mono bg-surface-2 rounded-lg px-3 py-2">
          cd ~/Projects/my-app && claude
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sessions Canvas
// ---------------------------------------------------------------------------

export default function SessionsCanvas() {
  const { sessions } = useActiveSessions(5000); // poll every 5s
  const liveFeed = useLiveFeed();

  // Start live feed
  useEffect(() => {
    liveFeed.start();
    return () => liveFeed.stop();
  }, []);

  // Group feed entries by projectPath
  const entriesByProject = useMemo(() => {
    const map = new Map<string, FeedEntry[]>();
    for (const entry of liveFeed.entries) {
      const key = entry.projectPath || '__global__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return map;
  }, [liveFeed.entries]);

  // Determine grid layout based on session count
  const gridCols = sessions.length <= 1
    ? 'grid-cols-1'
    : sessions.length <= 4
    ? 'grid-cols-2'
    : sessions.length <= 6
    ? 'grid-cols-3'
    : 'grid-cols-4';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle bg-surface-0 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-text-primary">Sessions</h1>
          {sessions.length > 0 && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-status-active/10 text-status-active text-micro font-medium">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-status-active" />
              </span>
              {sessions.length} live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-micro text-text-tertiary">
            {liveFeed.entries.length} events
          </span>
          {liveFeed.entries.length > 0 && (
            <button
              onClick={liveFeed.clear}
              className="text-micro text-text-tertiary hover:text-text-secondary transition-colors px-2 py-1 rounded-button hover:bg-surface-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Canvas area */}
      {sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={`flex-1 grid ${gridCols} gap-3 p-4 overflow-y-auto auto-rows-fr`}>
          {sessions.map((session) => (
            <SessionCard
              key={session.pid}
              session={session}
              entries={entriesByProject.get(session.projectPath) || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
