import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { ActiveSession } from '../../../shared/types';
import type { FeedEntry } from '../../hooks/useTerminal';
import { useTerminalSessions, useLiveFeed } from '../../hooks/useTerminal';
import { useActiveSessions } from '../../hooks/useSessions';
import { PlusIcon, CloseIcon, TerminalIcon, ClaudeIcon } from '../icons';

const XTerminal = dynamic(() => import('../terminal/XTerminal'), { ssr: false });

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
    default: return 'text-text-tertiary';
  }
}

function getTypeLabel(type: FeedEntry['type']): string {
  switch (type) {
    case 'user': return 'USR';
    case 'assistant': return 'CLD';
    case 'tool_use': return 'RUN';
    case 'tool_result': return 'RES';
    default: return 'SYS';
  }
}

function shortPath(p: string): string {
  const parts = p.split('/');
  return parts.length > 2 ? parts.slice(-2).join('/') : p;
}

// ---------------------------------------------------------------------------
// Detected Session Card — read-only live feed from external Claude processes
// ---------------------------------------------------------------------------

interface DetectedCardProps {
  session: ActiveSession;
  entries: FeedEntry[];
}

function DetectedCard({ session, entries }: DetectedCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  const displayName = session.sessionLabel || session.projectName;
  const recent = entries.slice(-80);

  return (
    <div className="flex flex-col bg-surface-1 border border-border-subtle rounded-card overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle shrink-0">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-status-active" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-primary truncate">{displayName}</p>
          <p className="text-micro text-text-tertiary font-mono truncate">
            {shortPath(session.projectPath)} &middot; PID {session.pid}
          </p>
        </div>
        <span className="px-1.5 py-0.5 rounded text-micro font-medium bg-accent/10 text-accent shrink-0">
          External
        </span>
      </div>

      {/* Live feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {recent.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-4">
              <p className="text-micro text-text-tertiary">Listening for activity...</p>
              <p className="text-micro text-text-tertiary mt-1 opacity-60">
                JSONL feed from this session will appear here
              </p>
            </div>
          </div>
        ) : (
          <div>
            {recent.map((entry, i) => (
              <div
                key={`${entry.timestamp}-${i}`}
                className="flex items-start gap-1.5 px-2.5 py-1 border-b border-border-subtle/20"
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

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border-subtle bg-surface-0 shrink-0">
        <span className="text-micro text-text-tertiary">{recent.length} events</span>
        <span className="text-micro text-status-active font-medium">Live</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Interactive Terminal Tile — PTY session created from within the app
// ---------------------------------------------------------------------------

interface TerminalTileProps {
  session: { id: string; title: string; pid: number; cwd: string };
  onClose: (e: React.MouseEvent, id: string) => void;
  isFocused: boolean;
  onFocus: (id: string) => void;
}

function TerminalTile({ session, onClose, isFocused, onFocus }: TerminalTileProps) {
  return (
    <div
      className={`flex flex-col bg-surface-0 border rounded-card overflow-hidden h-full transition-colors ${
        isFocused ? 'border-accent' : 'border-border-subtle'
      }`}
      onClick={() => onFocus(session.id)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border-subtle bg-surface-1 shrink-0">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-status-active" />
        </span>
        <span className="text-xs font-medium text-text-primary truncate flex-1">
          {session.title}
        </span>
        <span className="text-micro text-text-tertiary font-mono shrink-0">
          :{session.pid}
        </span>
        <button
          onClick={(e) => onClose(e, session.id)}
          className="p-0.5 rounded text-text-tertiary hover:text-status-dirty hover:bg-surface-3 transition-colors shrink-0"
          title="Close"
        >
          <CloseIcon size={10} />
        </button>
      </div>

      {/* Terminal */}
      <div className="flex-1 min-h-0 bg-[#0A0A0A]">
        <XTerminal sessionId={session.id} isVisible={true} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Menu
// ---------------------------------------------------------------------------

function AddMenu({ onAddShell, onAddClaude, onClose }: {
  onAddShell: () => void;
  onAddClaude: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 z-50 bg-surface-2 border border-border-subtle rounded-card shadow-xl py-1 min-w-[180px]">
        <button
          onClick={() => { onAddShell(); onClose(); }}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
        >
          <TerminalIcon size={14} />
          Shell
        </button>
        <button
          onClick={() => { onAddClaude(); onClose(); }}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
        >
          <ClaudeIcon size={14} />
          Claude Session
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ onAddShell, onAddClaude }: { onAddShell: () => void; onAddClaude: () => void }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-14 h-14 rounded-xl bg-surface-2 flex items-center justify-center mx-auto">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-text-tertiary">
            <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="16" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="2" y="16" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="16" y="16" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-text-secondary">No sessions</p>
          <p className="text-xs text-text-tertiary mt-1">
            Active Claude Code sessions will appear automatically.
            <br />You can also open new terminals here.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onAddShell}
            className="flex items-center gap-1.5 px-4 py-2 rounded-button text-xs font-medium bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
          >
            <TerminalIcon size={14} />
            Shell
          </button>
          <button
            onClick={onAddClaude}
            className="flex items-center gap-1.5 px-4 py-2 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            <ClaudeIcon size={14} />
            Claude Session
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sessions Canvas
// ---------------------------------------------------------------------------

export default function SessionsCanvas() {
  // Detected external sessions (Claude processes running elsewhere)
  const { sessions: detectedSessions } = useActiveSessions(5000);

  // Internal PTY sessions (created from this app)
  const { sessions: ptySessions, activeId, setActiveId, createSession, killSession } = useTerminalSessions();

  // Live feed for detected sessions
  const liveFeed = useLiveFeed();
  const [showMenu, setShowMenu] = useState(false);

  // Start live feed on mount
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

  const handleAddShell = useCallback(async () => {
    await createSession();
  }, [createSession]);

  const handleAddClaude = useCallback(async () => {
    await createSession(undefined, 'claude');
  }, [createSession]);

  const handleClose = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      await killSession(id);
    },
    [killSession]
  );

  const totalCount = detectedSessions.length + ptySessions.length;

  const gridClass =
    totalCount <= 1
      ? 'grid-cols-1'
      : totalCount <= 4
      ? 'grid-cols-2'
      : totalCount <= 9
      ? 'grid-cols-3'
      : 'grid-cols-4';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border-subtle bg-surface-0 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-text-primary">Sessions</h1>
          {detectedSessions.length > 0 && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-status-active/10 text-status-active text-micro font-medium">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-status-active" />
              </span>
              {detectedSessions.length} detected
            </span>
          )}
          {ptySessions.length > 0 && (
            <span className="text-micro text-text-tertiary">
              + {ptySessions.length} local
            </span>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            <PlusIcon size={12} />
            New
          </button>
          {showMenu && (
            <AddMenu
              onAddShell={handleAddShell}
              onAddClaude={handleAddClaude}
              onClose={() => setShowMenu(false)}
            />
          )}
        </div>
      </div>

      {/* Grid */}
      {totalCount === 0 ? (
        <EmptyState onAddShell={handleAddShell} onAddClaude={handleAddClaude} />
      ) : (
        <div className={`flex-1 grid ${gridClass} gap-2 p-2 min-h-0 overflow-auto auto-rows-fr`} style={{ minHeight: 0 }}>
          {/* Detected external sessions first */}
          {detectedSessions.map((session) => (
            <DetectedCard
              key={`ext-${session.pid}`}
              session={session}
              entries={entriesByProject.get(session.projectPath) || []}
            />
          ))}

          {/* Internal PTY sessions */}
          {ptySessions.map((session) => (
            <TerminalTile
              key={`pty-${session.id}`}
              session={session}
              onClose={handleClose}
              isFocused={activeId === session.id}
              onFocus={setActiveId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
