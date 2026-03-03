import React, { memo } from 'react';
import type { ClientWorkspace } from '../../../shared/client-types';
import type { Project } from '../../../shared/types';

interface ClientWorkspaceCardProps {
  workspace: ClientWorkspace;
  projects: Project[];
  activeSessions: number;
  onClick: () => void;
}

export default memo(function ClientWorkspaceCard({
  workspace,
  projects,
  activeSessions,
  onClick,
}: ClientWorkspaceCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group bg-surface-1 border border-border-subtle rounded-card p-5 cursor-pointer hover:border-border-default hover:border-l-accent/50 hover:border-l-2 transition-all duration-150"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
          {workspace.name}
        </h3>
        {activeSessions > 0 && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-status-active" />
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-text-tertiary">
        <span>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
        {activeSessions > 0 && (
          <span className="text-status-active">{activeSessions} live</span>
        )}
        {workspace.budget?.totalAllocated && (
          <span>Budget: {workspace.budget.currency || '$'}{workspace.budget.totalAllocated.toLocaleString()}</span>
        )}
      </div>

      {workspace.notes && (
        <p className="mt-2 text-xs text-text-secondary line-clamp-2" title={workspace.notes}>
          {workspace.notes}
        </p>
      )}
    </div>
  );
});
