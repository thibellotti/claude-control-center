import React, { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTerminalSessions } from '../../hooks/useTerminal';
import { PlusIcon, CloseIcon, TerminalIcon, ClaudeIcon } from '../icons';

const XTerminal = dynamic(() => import('../terminal/XTerminal'), { ssr: false });

// ---------------------------------------------------------------------------
// Session Tile — interactive terminal in a card
// ---------------------------------------------------------------------------

interface SessionTileProps {
  session: { id: string; title: string; pid: number; cwd: string };
  onClose: (e: React.MouseEvent, id: string) => void;
  isFocused: boolean;
  onFocus: (id: string) => void;
}

function SessionTile({ session, onClose, isFocused, onFocus }: SessionTileProps) {
  const shortCwd = session.cwd.split('/').slice(-2).join('/');

  return (
    <div
      className={`flex flex-col bg-surface-0 border rounded-card overflow-hidden h-full transition-colors ${
        isFocused ? 'border-accent' : 'border-border-subtle'
      }`}
      onClick={() => onFocus(session.id)}
    >
      {/* Tile header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border-subtle bg-surface-1 shrink-0">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-status-active" />
        </span>
        <span className="text-xs font-medium text-text-primary truncate flex-1">
          {session.title}
        </span>
        <span className="text-micro text-text-tertiary font-mono shrink-0">
          {shortCwd}
        </span>
        <span className="text-micro text-text-tertiary font-mono shrink-0">
          :{session.pid}
        </span>
        <button
          onClick={(e) => onClose(e, session.id)}
          className="p-0.5 rounded text-text-tertiary hover:text-status-dirty hover:bg-surface-3 transition-colors shrink-0"
          title="Close session"
        >
          <CloseIcon size={10} />
        </button>
      </div>

      {/* Terminal area */}
      <div className="flex-1 min-h-0 bg-[#0A0A0A]">
        <XTerminal sessionId={session.id} isVisible={true} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Session Menu
// ---------------------------------------------------------------------------

interface AddMenuProps {
  onAddShell: () => void;
  onAddClaude: () => void;
  onClose: () => void;
}

function AddMenu({ onAddShell, onAddClaude, onClose }: AddMenuProps) {
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
          <p className="text-sm font-medium text-text-secondary">No sessions open</p>
          <p className="text-xs text-text-tertiary mt-1">
            Open multiple terminals and Claude sessions side by side
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onAddShell}
            className="flex items-center gap-1.5 px-4 py-2 rounded-button text-xs font-medium bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
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
// Sessions Canvas — grid of interactive terminals
// ---------------------------------------------------------------------------

export default function SessionsCanvas() {
  const { sessions, activeId, setActiveId, createSession, killSession } = useTerminalSessions();
  const [showMenu, setShowMenu] = useState(false);

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

  // Grid layout based on count
  const gridClass =
    sessions.length <= 1
      ? 'grid-cols-1'
      : sessions.length <= 4
      ? 'grid-cols-2'
      : sessions.length <= 9
      ? 'grid-cols-3'
      : 'grid-cols-4';

  // Row height: fill available space
  const rowClass =
    sessions.length <= 2
      ? 'grid-rows-1'
      : sessions.length <= 4
      ? 'grid-rows-2'
      : sessions.length <= 6
      ? 'grid-rows-2'
      : 'grid-rows-3';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border-subtle bg-surface-0 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-text-primary">Sessions</h1>
          {sessions.length > 0 && (
            <span className="text-micro text-text-tertiary">
              {sessions.length} open
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

      {/* Canvas */}
      {sessions.length === 0 ? (
        <EmptyState onAddShell={handleAddShell} onAddClaude={handleAddClaude} />
      ) : (
        <div className={`flex-1 grid ${gridClass} ${rowClass} gap-2 p-2 min-h-0 overflow-hidden`}>
          {sessions.map((session) => (
            <SessionTile
              key={session.id}
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
