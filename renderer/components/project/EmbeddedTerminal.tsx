import React, { useEffect, useRef, useCallback } from 'react';
import { useTerminalSessions } from '../../hooks/useTerminal';
import XTerminal from '../terminal/XTerminal';
import { ClaudeIcon, TerminalIcon, CloseIcon as CloseTabIcon, PlusIcon } from '../icons';

interface EmbeddedTerminalProps {
  projectPath: string;
}

export default function EmbeddedTerminal({ projectPath }: EmbeddedTerminalProps) {
  const { sessions, activeId, setActiveId, createSession, killSession } = useTerminalSessions();
  const initialized = useRef(false);

  // Auto-create a Claude session on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    createSession(projectPath, 'claude');
  }, [projectPath, createSession]);

  const handleNewClaude = useCallback(() => {
    createSession(projectPath, 'claude');
  }, [projectPath, createSession]);

  const handleNewShell = useCallback(() => {
    createSession(projectPath);
  }, [projectPath, createSession]);

  const handleCloseTab = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    killSession(id);
  }, [killSession]);

  return (
    <div className="flex flex-col h-full bg-terminal-bg">
      {/* Tab bar */}
      <div className="flex items-center h-9 shrink-0 bg-surface-1 border-b border-border-subtle overflow-x-auto">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => setActiveId(session.id)}
            className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-medium border-r border-border-subtle transition-colors group shrink-0 ${
              activeId === session.id
                ? 'bg-terminal-bg text-white'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2'
            }`}
          >
            {session.title === 'Claude' ? <ClaudeIcon size={12} /> : <TerminalIcon size={12} />}
            <span className="truncate max-w-[100px]">{session.title}</span>
            <span
              onClick={(e) => handleCloseTab(e, session.id)}
              className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
            >
              <CloseTabIcon size={10} />
            </span>
          </button>
        ))}

        {/* New session buttons */}
        <div className="flex items-center gap-0.5 px-1.5 shrink-0">
          <button
            onClick={handleNewClaude}
            className="flex items-center gap-1 px-2 py-1 rounded text-micro text-text-tertiary hover:text-text-secondary hover:bg-surface-2 transition-colors"
            title="New Claude session"
          >
            <PlusIcon size={12} /> Claude
          </button>
          <button
            onClick={handleNewShell}
            className="flex items-center gap-1 px-2 py-1 rounded text-micro text-text-tertiary hover:text-text-secondary hover:bg-surface-2 transition-colors"
            title="New shell session"
          >
            <PlusIcon size={12} /> Shell
          </button>
        </div>
      </div>

      {/* Terminal area */}
      <div className="flex-1 min-h-0 relative">
        {sessions.map((session) => (
          <XTerminal
            key={session.id}
            sessionId={session.id}
            isVisible={session.id === activeId}
          />
        ))}
        {sessions.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-tertiary text-xs">
            No active sessions
          </div>
        )}
      </div>
    </div>
  );
}
