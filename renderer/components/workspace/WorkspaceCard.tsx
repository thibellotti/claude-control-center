import React, { memo, useState, useCallback, useMemo } from 'react';
import type { Workspace, Project } from '../../../shared/types';
import { PencilIcon, ChevronDownIcon, RemoveIcon } from '../icons';

interface WorkspaceCardProps {
  workspace: Workspace;
  projects: Project[];
  onEdit: (workspace: Workspace) => void;
  onSelectProject: (project: Project) => void;
  onRemoveProject: (workspaceId: string, projectPath: string) => void;
}

export default memo(function WorkspaceCard({
  workspace,
  projects,
  onEdit,
  onSelectProject,
  onRemoveProject,
}: WorkspaceCardProps) {
  const [expanded, setExpanded] = useState(false);

  const workspaceProjects = useMemo(() => {
    return workspace.projectPaths
      .map((path) => projects.find((p) => p.path === path))
      .filter(Boolean) as Project[];
  }, [workspace.projectPaths, projects]);

  const visibleProjects = expanded ? workspaceProjects : workspaceProjects.slice(0, 5);
  const hiddenCount = workspaceProjects.length - 5;

  const handleCardClick = useCallback(() => {
    if (workspaceProjects.length > 5) {
      setExpanded((prev) => !prev);
    }
  }, [workspaceProjects.length]);

  return (
    <div className="group relative bg-surface-1 border border-border-subtle rounded-card overflow-hidden hover:border-accent/30 transition-all duration-200">
      {/* Colored left border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: workspace.color }}
      />

      {/* Card content */}
      <div className="pl-5 pr-4 py-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h3 className="text-sm font-medium text-text-primary truncate">
              {workspace.name}
            </h3>
            <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-surface-3 text-micro font-medium text-text-secondary">
              {workspaceProjects.length}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(workspace);
            }}
            className="shrink-0 p-1 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Edit workspace"
            title="Edit workspace"
          >
            <PencilIcon />
          </button>
        </div>

        {/* Description */}
        {workspace.description && (
          <p className="text-xs text-text-tertiary line-clamp-1 mb-3">
            {workspace.description}
          </p>
        )}

        {/* Project list */}
        {workspaceProjects.length > 0 ? (
          <div className="space-y-1 mt-2">
            {visibleProjects.map((project) => (
              <div
                key={project.path}
                className="group/project flex items-center justify-between gap-2 px-2 py-1 rounded-md hover:bg-surface-2 transition-colors"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProject(project);
                  }}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  <span
                    className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                      project.status === 'active' ? 'bg-status-active' : 'bg-status-idle'
                    }`}
                  />
                  <span className="text-xs text-text-secondary truncate hover:text-text-primary transition-colors">
                    {project.name}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveProject(workspace.id, project.path);
                  }}
                  className="shrink-0 p-0.5 rounded-button text-text-tertiary hover:text-feedback-error hover:bg-feedback-error-muted transition-colors opacity-0 group-hover/project:opacity-100"
                  aria-label={`Remove ${project.name} from workspace`}
                  title="Remove from workspace"
                >
                  <RemoveIcon />
                </button>
              </div>
            ))}

            {/* Expand/collapse toggle */}
            {workspaceProjects.length > 5 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <span
                  className={`transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
                >
                  <ChevronDownIcon />
                </span>
                <span>{expanded ? 'Show less' : `+${hiddenCount} more`}</span>
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-text-tertiary mt-2 italic">
            No projects assigned yet
          </p>
        )}
      </div>
    </div>
  );
})
