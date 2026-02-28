import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Workspace } from '../../../shared/types';
import { useProjectContext } from '../../hooks/useProjectContext';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import WorkspaceCard from './WorkspaceCard';
import WorkspaceEditor from './WorkspaceEditor';
import { PlusIcon, BoardEmptyIcon } from '../icons';

function AssignDropdown({
  workspaces,
  onAssign,
  onClose,
}: {
  workspaces: Workspace[];
  onAssign: (workspaceId: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-20 w-48 bg-surface-2 border border-border-subtle rounded-card shadow-xl py-1"
    >
      {workspaces.length === 0 ? (
        <p className="px-3 py-2 text-xs text-text-tertiary">
          No workspaces yet. Create one first.
        </p>
      ) : (
        workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => {
              onAssign(ws.id);
              onClose();
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors text-left"
          >
            <span
              className="shrink-0 w-2 h-2 rounded-full"
              style={{ backgroundColor: ws.color }}
            />
            <span className="truncate">{ws.name}</span>
          </button>
        ))
      )}
    </div>
  );
}

export default function WorkspaceBoard() {
  const { projects, onSelectProject } = useProjectContext();
  const {
    workspaces,
    isLoading,
    save,
    remove,
    addProject,
    removeProject,
  } = useWorkspaces();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [assignDropdownPath, setAssignDropdownPath] = useState<string | null>(null);

  // Projects not assigned to any workspace
  const unassignedProjects = useMemo(() => {
    const assignedPaths = new Set(workspaces.flatMap((w) => w.projectPaths));
    return projects.filter((p) => !assignedPaths.has(p.path));
  }, [projects, workspaces]);

  const handleNewWorkspace = useCallback(() => {
    setEditingWorkspace(null);
    setEditorOpen(true);
  }, []);

  const handleEditWorkspace = useCallback((workspace: Workspace) => {
    setEditingWorkspace(workspace);
    setEditorOpen(true);
  }, []);

  const handleSave = useCallback(
    (workspace: Partial<Workspace> & { name: string }) => {
      save(workspace);
    },
    [save]
  );

  const handleDelete = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove]
  );

  const handleAssignProject = useCallback(
    (workspaceId: string, projectPath: string) => {
      addProject(workspaceId, projectPath);
    },
    [addProject]
  );

  const handleRemoveProject = useCallback(
    (workspaceId: string, projectPath: string) => {
      removeProject(workspaceId, projectPath);
    },
    [removeProject]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-text-tertiary text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse" />
          Loading workspaces...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Workspaces</h1>
          <p className="text-xs text-text-tertiary mt-1">
            Organize projects by client or category
          </p>
        </div>
        <button
          onClick={handleNewWorkspace}
          className="flex items-center gap-2 px-3 py-1.5 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          <PlusIcon />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Workspace grid or empty state */}
      {workspaces.length === 0 && unassignedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-tertiary">
          <BoardEmptyIcon />
          <p className="text-sm mt-4">No workspaces yet</p>
          <p className="text-xs mt-1">
            Create a workspace to start organizing your projects by client.
          </p>
          <button
            onClick={handleNewWorkspace}
            className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-button text-xs font-medium bg-surface-3 text-text-secondary hover:text-text-primary hover:bg-surface-4 transition-colors"
          >
            <PlusIcon />
            <span>Create Workspace</span>
          </button>
        </div>
      ) : (
        <>
          {/* Workspace cards */}
          {workspaces.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {workspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  projects={projects}
                  onEdit={handleEditWorkspace}
                  onSelectProject={onSelectProject}
                  onRemoveProject={handleRemoveProject}
                />
              ))}
            </div>
          )}

          {/* Unassigned projects */}
          {unassignedProjects.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Unassigned Projects
                </h2>
                <span className="px-1.5 py-0.5 rounded-full bg-surface-3 text-micro font-medium text-text-tertiary">
                  {unassignedProjects.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {unassignedProjects.map((project) => (
                  <div
                    key={project.path}
                    className="relative group bg-surface-1/60 border border-border-subtle rounded-card px-3 py-2.5 hover:border-border-default transition-all duration-200"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => onSelectProject(project)}
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
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignDropdownPath(
                              assignDropdownPath === project.path ? null : project.path
                            );
                          }}
                          className="shrink-0 p-1 rounded-button text-text-tertiary hover:text-accent hover:bg-accent/10 transition-colors opacity-0 group-hover:opacity-100"
                          aria-label={`Assign ${project.name} to workspace`}
                          title="Assign to workspace"
                        >
                          <PlusIcon />
                        </button>
                        {assignDropdownPath === project.path && (
                          <AssignDropdown
                            workspaces={workspaces}
                            onAssign={(wsId) => handleAssignProject(wsId, project.path)}
                            onClose={() => setAssignDropdownPath(null)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Editor modal */}
      {editorOpen && (
        <WorkspaceEditor
          workspace={editingWorkspace}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => {
            setEditorOpen(false);
            setEditingWorkspace(null);
          }}
        />
      )}
    </div>
  );
}
