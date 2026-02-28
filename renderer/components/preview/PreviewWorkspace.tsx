import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { Project } from '../../../shared/types';
import PreviewPanel from './PreviewPanel';
import IntegrationStrip, { type IntegrationId } from './IntegrationStrip';
import SupabasePanel from '../integrations/SupabasePanel';
import VercelPanel from '../integrations/VercelPanel';
import GitHubPanel from '../integrations/GitHubPanel';
import XTerminal from '../terminal/XTerminal';
import { useTerminalSessions } from '../../hooks/useTerminal';
import { CloseIcon, TerminalIcon, ChevronUpIcon, ChevronDownIcon } from '../icons';

interface PreviewWorkspaceProps {
  project: Project;
}

export default function PreviewWorkspace({ project }: PreviewWorkspaceProps) {
  const [overlay, setOverlay] = useState<IntegrationId | null>(null);
  const [showTerminal, setShowTerminal] = useState(true);
  const { sessions, activeId, createSession } = useTerminalSessions();
  const initialized = useRef(false);

  const hasPreview = (() => {
    const scripts = project.packageJson?.scripts;
    return !!(scripts?.dev || scripts?.start || scripts?.serve);
  })();

  // Auto-create a shell session for the preview terminal
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    createSession(project.path);
  }, [project.path, createSession]);

  const handleToggleOverlay = useCallback((id: IntegrationId) => {
    setOverlay((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="flex flex-col h-full bg-surface-0 relative">
      <Group orientation="vertical" className="flex-1">
        {/* Preview area */}
        <Panel defaultSize={showTerminal ? 65 : 100} minSize={30}>
          <div className="h-full">
            {hasPreview ? (
              <PreviewPanel projectPath={project.path} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
                <p className="text-sm text-text-secondary text-center">No dev script found</p>
                <p className="text-xs text-text-tertiary text-center">
                  Add a <code className="px-1 py-0.5 bg-surface-2 rounded text-micro">dev</code> script to package.json
                </p>
              </div>
            )}
          </div>
        </Panel>

        {showTerminal && (
          <>
            <Separator className="h-1 bg-border-subtle hover:bg-accent/40 transition-colors cursor-row-resize" />
            <Panel defaultSize={35} minSize={15}>
              <div className="flex flex-col h-full">
                {/* Terminal header */}
                <div className="flex items-center h-7 shrink-0 px-2 bg-surface-1 border-b border-border-subtle">
                  <TerminalIcon size={12} />
                  <span className="text-micro font-medium text-text-secondary ml-1.5">Shell</span>
                  <div className="flex-1" />
                  <button
                    onClick={() => setShowTerminal(false)}
                    className="p-0.5 rounded text-text-tertiary hover:text-text-primary transition-colors"
                    title="Collapse terminal"
                  >
                    <ChevronDownIcon />
                  </button>
                </div>
                {/* Terminal content */}
                <div className="flex-1 min-h-0">
                  {sessions.map((session) => (
                    <XTerminal
                      key={session.id}
                      sessionId={session.id}
                      isVisible={session.id === activeId}
                    />
                  ))}
                </div>
              </div>
            </Panel>
          </>
        )}
      </Group>

      {/* Bottom bar: integration strip + terminal toggle */}
      <div className="shrink-0 flex items-center border-t border-border-subtle bg-surface-1">
        {!showTerminal && (
          <button
            onClick={() => setShowTerminal(true)}
            className="flex items-center gap-1 px-2.5 h-9 text-[11px] font-medium text-text-tertiary hover:text-text-secondary transition-colors"
            title="Show terminal"
          >
            <TerminalIcon size={12} />
            <span>Terminal</span>
            <ChevronUpIcon />
          </button>
        )}
        <div className="flex-1">
          <IntegrationStrip
            project={project}
            activeOverlay={overlay}
            onToggleOverlay={handleToggleOverlay}
          />
        </div>
      </div>

      {/* Overlay panel */}
      {overlay && (
        <div className="absolute top-0 right-0 bottom-9 w-[320px] bg-surface-0 border-l border-border-subtle shadow-lg z-10 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle shrink-0">
            <span className="text-xs font-medium text-text-secondary capitalize">{overlay}</span>
            <button
              onClick={() => setOverlay(null)}
              className="p-1 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {overlay === 'supabase' && <SupabasePanel projectPath={project.path} />}
            {overlay === 'vercel' && <VercelPanel projectPath={project.path} />}
            {overlay === 'github' && <GitHubPanel projectPath={project.path} project={project} />}
          </div>
        </div>
      )}
    </div>
  );
}
