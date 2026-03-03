import React, { useEffect, useRef } from 'react';
import type { AgentRun } from '../../../shared/agent-types';
import { StopIcon, CloseIcon } from '../icons';

interface AgentRunnerProps {
  run: AgentRun | null;
  onKill: (runId: string) => void;
  onClose: () => void;
}

function StatusBadge({ status }: { status: AgentRun['status'] }) {
  const styles: Record<AgentRun['status'], string> = {
    running: 'bg-status-active/20 text-status-active',
    completed: 'bg-status-active/20 text-status-active',
    failed: 'bg-feedback-error-muted text-feedback-error',
    killed: 'bg-feedback-warning-muted text-feedback-warning',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-micro font-medium ${styles[status]}`}>
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-status-active animate-pulse" />
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function AgentRunner({ run, onKill, onClose }: AgentRunnerProps) {
  const outputRef = useRef<HTMLPreElement>(null);

  // Auto-scroll to bottom when output updates
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [run?.output]);

  if (!run) return null;

  const projectName = run.projectPath.split('/').pop() || run.projectPath;
  const isRunning = run.status === 'running';

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base shrink-0 select-none" role="img" aria-label={run.agentName}>
            {run.agentIcon}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary truncate">
                {run.agentName}
              </span>
              <StatusBadge status={run.status} />
            </div>
            <p className="text-micro text-text-tertiary truncate mt-0.5">
              {projectName} — {run.task}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isRunning && (
            <button
              onClick={() => onKill(run.id)}
              className="flex items-center gap-1 px-2 py-1 rounded-button text-xs text-feedback-error hover:bg-feedback-error-muted transition-colors"
              title="Kill agent"
            >
              <StopIcon />
              <span>Kill</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors"
            aria-label="Close runner"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Output area */}
      <pre
        ref={outputRef}
        className="p-4 text-xs font-mono text-text-secondary leading-relaxed overflow-y-auto max-h-[400px] bg-surface-0 whitespace-pre-wrap break-words"
      >
        {run.output || (isRunning ? 'Waiting for output...' : 'No output.')}
      </pre>

      {/* Footer with timing info */}
      {run.completedAt && (
        <div className="px-4 py-2 border-t border-border-subtle text-micro text-text-tertiary">
          Completed in {Math.round((run.completedAt - run.startedAt) / 1000)}s
        </div>
      )}
    </div>
  );
}
