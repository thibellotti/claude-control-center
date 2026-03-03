import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOrchestrator } from '../../hooks/useOrchestrator';
import { useTerminalSessions } from '../../hooks/useTerminal';
import { useProjectContext } from '../../hooks/useProjectContext';
import OrchestratorToolbar from './OrchestratorToolbar';
import OrchestratorGrid from './OrchestratorGrid';
import OrchestratorDrawer from './OrchestratorDrawer';
import { TerminalIcon, ClaudeIcon } from '../icons';
import type { TaskItem, SessionSearchResult } from '../../../shared/types';

const DEFAULT_PREVIEW_URL = 'http://localhost:3000';

interface OrchestratorPageProps {
  initialProject?: {
    path: string;
    mode: 'claude' | 'claude --dangerously-skip-permissions';
  };
}

export default function OrchestratorPage({ initialProject }: OrchestratorPageProps) {
  const orchestrator = useOrchestrator();
  const { createSession, killSession } = useTerminalSessions();
  const { projects } = useProjectContext();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchResult, setSearchResult] = useState<SessionSearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Restore workspace on mount — skip if initialProject will create fresh cells.
  // orchestrator is a stable singleton; intentionally omitted from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!initialProject) {
      orchestrator.restoreWorkspace();
    }
  }, []);

  // Persist workspace when cells change
  useEffect(() => {
    orchestrator.persistWorkspace();
  }, [orchestrator.cells, orchestrator.persistWorkspace]);

  // Auto-create Claude + Preview cells when opening from a project
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initialProject || initializedRef.current) return;
    initializedRef.current = true;

    const abortController = new AbortController();

    // Clear any stale cells, then create fresh split
    orchestrator.clearCells();

    const timeout = setTimeout(async () => {
      const sessionId = await createSession(initialProject.path, initialProject.mode);
      if (abortController.signal.aborted) return;

      const isAutopilot = initialProject.mode.includes('--dangerously-skip-permissions');
      orchestrator.addCell({
        type: 'terminal',
        sessionId,
        label: isAutopilot ? 'Claude Autopilot' : 'Claude',
        cwd: initialProject.path,
        command: initialProject.mode,
      });

      orchestrator.addCell({
        type: 'preview',
        url: DEFAULT_PREVIEW_URL,
        label: 'Preview',
        projectPath: initialProject.path,
      });
    }, 100);

    return () => {
      clearTimeout(timeout);
      abortController.abort();
    };
  }, [initialProject, createSession, orchestrator.clearCells, orchestrator.addCell]);

  // Derive default project path from known projects or terminal cells
  const getDefaultProjectPath = useCallback((): string => {
    if (initialProject) return initialProject.path;
    const terminalCell = orchestrator.cells.find(
      (c) => c.config.type === 'terminal' && c.config.cwd && c.config.cwd !== '~'
    );
    if (terminalCell && terminalCell.config.type === 'terminal') {
      return terminalCell.config.cwd;
    }
    if (projects.length > 0) {
      return projects[0].path;
    }
    return '~';
  }, [initialProject, orchestrator.cells, projects]);

  // Derive project name and mode badge for toolbar
  const projectName = useMemo(() => {
    if (initialProject) {
      return initialProject.path.split('/').pop() || null;
    }
    const terminalCell = orchestrator.cells.find(
      (c) => c.config.type === 'terminal' && c.config.cwd && c.config.cwd !== '~'
    );
    if (terminalCell && terminalCell.config.type === 'terminal') {
      return terminalCell.config.cwd.split('/').pop() || null;
    }
    return null;
  }, [initialProject, orchestrator.cells]);

  const modeBadge = useMemo(() => {
    const terminalCell = orchestrator.cells.find((c) => c.config.type === 'terminal');
    if (!terminalCell || terminalCell.config.type !== 'terminal') return null;
    if (terminalCell.config.command?.includes('--dangerously-skip-permissions')) return 'Autopilot';
    if (terminalCell.config.command?.startsWith('claude')) return 'Claude';
    return 'Shell';
  }, [orchestrator.cells]);

  // Derive project path and tasks for drawer
  const projectPath = useMemo(() => {
    const p = getDefaultProjectPath();
    return p !== '~' ? p : null;
  }, [getDefaultProjectPath]);

  const projectTasks = useMemo((): TaskItem[] => {
    if (!projectPath) return [];
    const project = projects.find((p) => p.path === projectPath);
    return project?.tasks ?? [];
  }, [projectPath, projects]);

  const handleAddTerminal = useCallback(
    async (command?: string) => {
      const cwd = getDefaultProjectPath();
      const sessionId = await createSession(cwd !== '~' ? cwd : undefined, command);
      const isAutopilot = command?.includes('--dangerously-skip-permissions');
      const isClaude = command?.startsWith('claude');
      orchestrator.addCell({
        type: 'terminal',
        sessionId,
        label: isAutopilot ? 'Claude Autopilot' : isClaude ? 'Claude' : 'Shell',
        cwd,
        command,
      });
    },
    [createSession, orchestrator.addCell, getDefaultProjectPath]
  );

  const handleAddPreview = useCallback((url?: string) => {
    const pp = getDefaultProjectPath();
    const targetUrl = url || DEFAULT_PREVIEW_URL;
    const isExternal = (() => {
      try { const u = new URL(targetUrl); return u.hostname !== 'localhost' && u.hostname !== '127.0.0.1'; }
      catch { return false; }
    })();
    orchestrator.addCell({
      type: 'preview',
      url: targetUrl,
      label: isExternal ? targetUrl.replace(/^https?:\/\//, '').split('/')[0] : 'Preview',
      projectPath: isExternal ? undefined : (pp !== '~' ? pp : undefined),
    });
  }, [orchestrator.addCell, getDefaultProjectPath]);

  const handleAddDiff = useCallback(() => {
    const pp = getDefaultProjectPath();
    if (pp === '~') return;
    orchestrator.addCell({
      type: 'diff',
      projectPath: pp,
      label: 'Diff',
      mode: 'live',
    });
  }, [orchestrator.addCell, getDefaultProjectPath]);

  const handleAddWorktreeAgent = useCallback(async () => {
    const pp = getDefaultProjectPath();
    if (pp === '~') return;
    const session = await window.api.worktreeCreate({ projectPath: pp });
    await window.api.worktreeSpawnAgent({ worktreeSessionId: session.id });
    orchestrator.addCell({
      type: 'agent-worktree',
      worktreeSessionId: session.id,
      label: session.branchName,
      projectPath: pp,
    });
  }, [orchestrator.addCell, getDefaultProjectPath]);

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
        projectName={projectName}
        modeBadge={modeBadge}
        onAddTerminal={handleAddTerminal}
        onAddPreview={handleAddPreview}
        onAddDiff={handleAddDiff}
        onAddWorktreeAgent={handleAddWorktreeAgent}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen((prev) => !prev)}
        onSearchResultSelect={(result) => {
          setSearchResult(result);
          setSearchQuery(result.matches[0]?.content || '');
          setDrawerOpen(true);
        }}
      />

      {isEmpty ? (
        <div className="flex items-center justify-center flex-1">
          <div className="text-center space-y-4 max-w-md">
            <div>
              <p className="text-sm font-medium text-text-secondary">Start a session</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleAddTerminal('claude')}
                className="flex items-center gap-1 px-4 py-2 rounded-button text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover transition-colors"
              >
                <ClaudeIcon size={14} />
                Claude
              </button>
              <button
                onClick={() => handleAddTerminal()}
                className="flex items-center gap-1 px-4 py-2 rounded-button text-xs font-medium bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
              >
                <TerminalIcon size={14} />
                Shell
              </button>
            </div>
            <p className="text-xs text-text-tertiary">
              or open a project from the Dashboard
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 min-w-0 h-full">
            <OrchestratorGrid
              cells={orchestrator.cells}
              activeCell={orchestrator.activeCell}
              onCloseCell={handleCloseCell}
              onFocusCell={orchestrator.setActiveCell}
            />
          </div>
          <OrchestratorDrawer
            open={drawerOpen}
            projectPath={projectPath}
            tasks={projectTasks}
            searchResult={searchResult}
            searchQuery={searchQuery}
            onClearSearch={() => { setSearchResult(null); setSearchQuery(''); }}
          />
        </div>
      )}
    </div>
  );
}
