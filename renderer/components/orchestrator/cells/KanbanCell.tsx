import React, { useState, useCallback, useRef } from 'react';
import type { CellConfigKanban, KanbanColumnId, TaskItem } from '../../../../shared/types';
import { useKanban } from '../../../hooks/useKanban';
import { useAgents } from '../../../hooks/useAgents';
import { PlusIcon, TrashIcon } from '../../icons';

interface KanbanCellProps {
  config: CellConfigKanban;
}

const COLUMNS: { id: KanbanColumnId; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

const STATUS_DOT: Record<KanbanColumnId, string> = {
  backlog: 'bg-text-tertiary',
  in_progress: 'bg-accent',
  review: 'bg-feedback-warning',
  done: 'bg-feedback-success',
};

export default function KanbanCell({ config }: KanbanCellProps) {
  const {
    columns,
    moveTask,
    addTask,
    removeTask,
    editTask,
    importTodos,
    dragState,
    setDragState,
    isLoading,
  } = useKanban(config.projectPath);

  const { agents } = useAgents();

  const [dropTarget, setDropTarget] = useState<KanbanColumnId | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; taskId: string; columnId: KanbanColumnId } | null>(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingTo, setAddingTo] = useState<KanbanColumnId | null>(null);
  const [newTaskValue, setNewTaskValue] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = useCallback((taskId: string, sourceColumn: KanbanColumnId) => {
    setDragState({ taskId, sourceColumn });
  }, [setDragState]);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: KanbanColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(columnId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetColumn: KanbanColumnId) => {
    e.preventDefault();
    setDropTarget(null);
    if (dragState.taskId && dragState.sourceColumn) {
      moveTask(dragState.taskId, dragState.sourceColumn, targetColumn);
    }
    setDragState({ taskId: null, sourceColumn: null });
  }, [dragState, moveTask, setDragState]);

  const handleDragEnd = useCallback(() => {
    setDragState({ taskId: null, sourceColumn: null });
    setDropTarget(null);
  }, [setDragState]);

  const handleContextMenu = useCallback((e: React.MouseEvent, taskId: string, columnId: KanbanColumnId) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, taskId, columnId });
  }, []);

  const handleStartEdit = useCallback((task: TaskItem) => {
    setEditingTask(task.id);
    setEditValue(task.subject);
    setContextMenu(null);
  }, []);

  const handleFinishEdit = useCallback(() => {
    if (editingTask && editValue.trim()) {
      editTask(editingTask, { subject: editValue.trim() });
    }
    setEditingTask(null);
    setEditValue('');
  }, [editingTask, editValue, editTask]);

  const handleAddTask = useCallback((columnId: KanbanColumnId) => {
    setAddingTo(columnId);
    setNewTaskValue('');
    setTimeout(() => addInputRef.current?.focus(), 50);
  }, []);

  const handleConfirmAdd = useCallback(() => {
    if (addingTo && newTaskValue.trim()) {
      addTask(addingTo, { subject: newTaskValue.trim() });
    }
    setAddingTo(null);
    setNewTaskValue('');
  }, [addingTo, newTaskValue, addTask]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-text-tertiary">Loading board...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle shrink-0">
        <button
          onClick={() => importTodos(config.projectPath)}
          className="px-2 py-1 rounded-button text-micro font-medium bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
        >
          Import TODOs
        </button>
        <button
          onClick={() => handleAddTask('backlog')}
          className="flex items-center gap-1 px-2 py-1 rounded-button text-micro font-medium bg-accent text-accent-foreground hover:bg-accent-hover transition-colors"
        >
          <PlusIcon size={10} />
          Add Task
        </button>
      </div>

      {/* Columns */}
      <div className="flex flex-1 min-h-0 overflow-x-auto">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className={`flex flex-col flex-1 min-w-[160px] border-r border-border-subtle/50 last:border-r-0 transition-colors ${
              dropTarget === col.id ? 'bg-accent/5' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2 shrink-0">
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[col.id]}`} />
              <span className="text-micro font-medium text-text-secondary">{col.label}</span>
              <span className="text-micro text-text-tertiary">
                ({columns[col.id].length})
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5">
              {columns[col.id].map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task.id, col.id)}
                  onDragEnd={handleDragEnd}
                  onContextMenu={(e) => handleContextMenu(e, task.id, col.id)}
                  className={`group px-2.5 py-2 rounded-button bg-surface-1 border border-border-subtle cursor-grab active:cursor-grabbing hover:border-accent/40 transition-colors ${
                    dragState.taskId === task.id ? 'opacity-40' : ''
                  }`}
                >
                  {editingTask === task.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleFinishEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishEdit();
                        if (e.key === 'Escape') { setEditingTask(null); setEditValue(''); }
                      }}
                      className="w-full text-xs bg-transparent text-text-primary outline-none border-b border-accent"
                    />
                  ) : (
                    <div className="flex items-start gap-1.5">
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[col.id]}`} />
                      <span className="text-xs text-text-primary leading-snug break-words flex-1">
                        {task.subject}
                      </span>
                    </div>
                  )}
                  {task.description && (
                    <p className="text-micro text-text-tertiary mt-0.5 ml-3 truncate">
                      {task.description}
                    </p>
                  )}
                </div>
              ))}

              {/* Inline add task input */}
              {addingTo === col.id && (
                <div className="px-2.5 py-2 rounded-button bg-surface-1 border border-accent">
                  <input
                    ref={addInputRef}
                    value={newTaskValue}
                    onChange={(e) => setNewTaskValue(e.target.value)}
                    onBlur={handleConfirmAdd}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmAdd();
                      if (e.key === 'Escape') { setAddingTo(null); setNewTaskValue(''); }
                    }}
                    placeholder="Task title..."
                    className="w-full text-xs bg-transparent text-text-primary outline-none placeholder:text-text-tertiary"
                  />
                </div>
              )}

              {/* Column add button */}
              {addingTo !== col.id && (
                <button
                  onClick={() => handleAddTask(col.id)}
                  className="flex items-center gap-1 w-full px-2 py-1.5 rounded-button text-micro text-text-tertiary hover:text-text-secondary hover:bg-surface-2 transition-colors"
                >
                  <PlusIcon size={10} />
                  Add
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-surface-2 border border-border-subtle rounded-card shadow-xl py-1 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                const task = columns[contextMenu.columnId].find((t) => t.id === contextMenu.taskId);
                if (task) handleStartEdit(task);
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => {
                removeTask(contextMenu.taskId);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-status-dirty hover:bg-surface-3 transition-colors"
            >
              <TrashIcon size={12} />
              Delete
            </button>
            <div className="border-t border-border-subtle my-1" />
            {agents.length > 0 ? (
              showAgentPicker ? (
                <div className="px-1 py-1 space-y-0.5">
                  <p className="px-2 py-1 text-micro text-text-tertiary font-medium">Assign to:</p>
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        editTask(contextMenu.taskId, { description: `Assigned to: ${agent.name}` });
                        setShowAgentPicker(false);
                        setContextMenu(null);
                      }}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors rounded"
                    >
                      <span>{agent.icon}</span>
                      <span>{agent.name}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      editTask(contextMenu.taskId, { description: '' });
                      setShowAgentPicker(false);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-text-tertiary hover:text-text-secondary hover:bg-surface-3 transition-colors rounded"
                  >
                    Unassign
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAgentPicker(true)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                >
                  Assign to Agent
                </button>
              )
            ) : (
              <button
                onClick={() => setContextMenu(null)}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-tertiary hover:bg-surface-3 transition-colors cursor-not-allowed"
                disabled
              >
                Assign to Agent
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
