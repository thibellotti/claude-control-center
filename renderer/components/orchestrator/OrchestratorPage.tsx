import React, { useCallback, useEffect } from 'react';
import { useOrchestrator } from '../../hooks/useOrchestrator';
import { useTerminalSessions } from '../../hooks/useTerminal';
import OrchestratorToolbar from './OrchestratorToolbar';
import OrchestratorGrid from './OrchestratorGrid';
import { TerminalIcon, ClaudeIcon } from '../icons';

export default function OrchestratorPage() {
  const orchestrator = useOrchestrator();
  const { createSession, killSession } = useTerminalSessions();

  // Restore workspace on mount
  useEffect(() => {
    orchestrator.restoreWorkspace();
  }, []);

  // Persist workspace when cells or layout change
  useEffect(() => {
    orchestrator.persistWorkspace();
  }, [orchestrator.cells, orchestrator.layout]);

  const handleAddTerminal = useCallback(
    async (command?: string) => {
      const sessionId = await createSession(undefined, command);
      const isClaude = command === 'claude';
      orchestrator.addCell({
        type: 'terminal',
        sessionId,
        label: isClaude ? 'Claude' : 'Shell',
        cwd: '~',
        command,
      });
    },
    [createSession, orchestrator.addCell]
  );

  const handleAddFeed = useCallback(() => {
    orchestrator.addCell({
      type: 'feed',
      projectPath: '~',
      label: 'Activity Feed',
    });
  }, [orchestrator.addCell]);

  const handleAddTaskBoard = useCallback(() => {
    orchestrator.addCell({
      type: 'taskboard',
      teamName: '',
      label: 'Task Board',
    });
  }, [orchestrator.addCell]);

  const handleAddPreview = useCallback(() => {
    orchestrator.addCell({
      type: 'preview',
      url: 'http://localhost:3000',
      label: 'Preview',
    });
  }, [orchestrator.addCell]);

  const handleCloseCell = useCallback(
    async (id: string) => {
      const cell = orchestrator.cells.find((c) => c.id === id);
      if (cell?.config.type === 'terminal' && cell.config.sessionId) {
        await killSession(cell.config.sessionId);
      }
      orchestrator.removeCell(id);
    },
    [orchestrator.cells, orchestrator.removeCell, killSession]
  );

  const isEmpty = orchestrator.cells.length === 0;

  return (
    <div className="flex flex-col h-full">
      <OrchestratorToolbar
        layout={orchestrator.layout}
        cellCount={orchestrator.cells.length}
        onSetLayout={orchestrator.setLayout}
        onAddTerminal={handleAddTerminal}
        onAddFeed={handleAddFeed}
        onAddTaskBoard={handleAddTaskBoard}
        onAddPreview={handleAddPreview}
      />

      {isEmpty ? (
        <div className="flex items-center justify-center flex-1">
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
              <p className="text-sm font-medium text-text-secondary">Orchestrator</p>
              <p className="text-xs text-text-tertiary mt-1">
                Create terminals, feeds, and previews in a flexible grid.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleAddTerminal()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-button text-xs font-medium bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
              >
                <TerminalIcon size={14} />
                Shell
              </button>
              <button
                onClick={() => handleAddTerminal('claude')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
              >
                <ClaudeIcon size={14} />
                Claude Session
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <OrchestratorGrid
            cells={orchestrator.cells}
            layout={orchestrator.layout}
            activeCell={orchestrator.activeCell}
            onCloseCell={handleCloseCell}
            onFocusCell={orchestrator.setActiveCell}
          />
        </div>
      )}
    </div>
  );
}
