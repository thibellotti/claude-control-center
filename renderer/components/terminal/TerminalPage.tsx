import React, { useState, useCallback } from 'react';
import XTerminal from './XTerminal';
import LiveFeed from './LiveFeed';
import { useTerminalSessions, useLiveFeed } from '../../hooks/useTerminal';
import { PlusIcon, CloseIcon, FeedIcon } from '../icons';

export default function TerminalPage() {
  const { sessions, activeId, setActiveId, createSession, killSession } = useTerminalSessions();
  const liveFeed = useLiveFeed();
  const [showFeed, setShowFeed] = useState(true);
  const [feedWidth, setFeedWidth] = useState(320);

  // Start live feed on mount
  React.useEffect(() => {
    liveFeed.start();
    return () => liveFeed.stop();
  }, []);

  const handleNewTerminal = useCallback(async () => {
    await createSession();
  }, [createSession]);

  const handleNewClaudeSession = useCallback(async (cwd?: string) => {
    await createSession(cwd, 'claude');
  }, [createSession]);

  const handleCloseTab = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      await killSession(id);
    },
    [killSession]
  );

  // Resize handle for the feed panel
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = feedWidth;

      const onMouseMove = (moveE: MouseEvent) => {
        const delta = startX - moveE.clientX;
        const newWidth = Math.max(200, Math.min(600, startWidth + delta));
        setFeedWidth(newWidth);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [feedWidth]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface-1 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewTerminal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium bg-surface-3 text-text-secondary hover:text-text-primary hover:bg-surface-4 transition-colors"
          >
            <PlusIcon />
            Terminal
          </button>
          <button
            onClick={() => handleNewClaudeSession()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            <PlusIcon />
            Claude Session
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFeed(!showFeed)}
            className={`p-1.5 rounded-button transition-colors ${
              showFeed
                ? 'bg-surface-3 text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2'
            }`}
            title={showFeed ? 'Hide live feed' : 'Show live feed'}
          >
            <FeedIcon />
          </button>
        </div>
      </div>

      {/* Tab bar (if sessions exist) */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-0 px-2 pt-1 bg-surface-0 border-b border-border-subtle shrink-0 overflow-x-auto">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveId(session.id)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs border-b-2 transition-colors shrink-0 ${
                activeId === session.id
                  ? 'border-accent text-text-primary bg-surface-1'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:bg-surface-1'
              }`}
            >
              <span className="truncate max-w-[120px]">{session.title}</span>
              <span className="text-micro font-mono text-text-tertiary">
                :{session.pid}
              </span>
              <button
                onClick={(e) => handleCloseTab(e, session.id)}
                className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-status-dirty hover:bg-surface-3 transition-all"
                title="Close terminal"
              >
                <CloseIcon size={10} />
              </button>
            </button>
          ))}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Terminal area */}
        <div className="flex-1 min-w-0 bg-terminal-bg">
          {sessions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="text-text-tertiary space-y-1">
                  <p className="text-sm font-medium">No terminals open</p>
                  <p className="text-xs">Open a terminal or start a Claude session</p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleNewTerminal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-button text-xs font-medium bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
                  >
                    <PlusIcon />
                    Terminal
                  </button>
                  <button
                    onClick={() => handleNewClaudeSession()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
                  >
                    <PlusIcon />
                    Claude Session
                  </button>
                </div>
              </div>
            </div>
          ) : (
            sessions.map((session) => (
              <XTerminal
                key={session.id}
                sessionId={session.id}
                isVisible={session.id === activeId}
              />
            ))
          )}
        </div>

        {/* Live feed panel */}
        {showFeed && (
          <>
            {/* Resize handle */}
            <div
              className="w-1 cursor-col-resize bg-border-subtle hover:bg-accent transition-colors shrink-0"
              onMouseDown={handleResizeStart}
            />
            {/* Feed panel */}
            <div
              className="bg-surface-1 shrink-0 overflow-hidden"
              style={{ width: feedWidth }}
            >
              <LiveFeed entries={liveFeed.entries} onClear={liveFeed.clear} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
