import { useState, useCallback, useEffect, useRef } from 'react';
import type { TaskItem, KanbanColumnId } from '../../shared/types';

interface DragState {
  taskId: string | null;
  sourceColumn: KanbanColumnId | null;
}

interface UseKanbanReturn {
  columns: Record<KanbanColumnId, TaskItem[]>;
  moveTask: (taskId: string, from: KanbanColumnId, to: KanbanColumnId) => void;
  addTask: (columnId: KanbanColumnId, task: Partial<TaskItem>) => void;
  removeTask: (taskId: string) => void;
  editTask: (taskId: string, updates: Partial<TaskItem>) => void;
  importTodos: (projectPath: string) => Promise<void>;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  isLoading: boolean;
}

const COLUMN_ORDER: KanbanColumnId[] = ['backlog', 'in_progress', 'review', 'done'];

function storageKey(projectPath: string) {
  return `kanban:${projectPath}`;
}

function emptyColumns(): Record<KanbanColumnId, TaskItem[]> {
  return { backlog: [], in_progress: [], review: [], done: [] };
}

// Map TaskItem.status to the appropriate kanban column
function statusToColumn(status: TaskItem['status']): KanbanColumnId {
  switch (status) {
    case 'pending': return 'backlog';
    case 'in_progress': return 'in_progress';
    case 'completed': return 'done';
    case 'deleted': return 'done';
    default: return 'backlog';
  }
}

export function useKanban(projectPath: string): UseKanbanReturn {
  const [columns, setColumns] = useState<Record<KanbanColumnId, TaskItem[]>>(emptyColumns);
  const [dragState, setDragState] = useState<DragState>({ taskId: null, sourceColumn: null });
  const [isLoading, setIsLoading] = useState(true);
  const initializedRef = useRef(false);

  // Load persisted column state on mount
  useEffect(() => {
    if (!projectPath) return;
    try {
      const raw = localStorage.getItem(storageKey(projectPath));
      if (raw) {
        const parsed = JSON.parse(raw) as Record<KanbanColumnId, TaskItem[]>;
        // Validate structure
        const valid = COLUMN_ORDER.every((col) => Array.isArray(parsed[col]));
        if (valid) {
          setColumns(parsed);
        }
      }
    } catch {
      // Ignore malformed localStorage
    }
    setIsLoading(false);
    initializedRef.current = true;
  }, [projectPath]);

  // Persist whenever columns change (after initial load)
  useEffect(() => {
    if (!projectPath || !initializedRef.current) return;
    try {
      localStorage.setItem(storageKey(projectPath), JSON.stringify(columns));
    } catch {
      // localStorage full — silent fail
    }
  }, [columns, projectPath]);

  const moveTask = useCallback((taskId: string, from: KanbanColumnId, to: KanbanColumnId) => {
    if (from === to) return;
    setColumns((prev) => {
      const task = prev[from].find((t) => t.id === taskId);
      if (!task) return prev;

      const statusMap: Record<KanbanColumnId, TaskItem['status']> = {
        backlog: 'pending',
        in_progress: 'in_progress',
        review: 'in_progress',
        done: 'completed',
      };

      const updated: TaskItem = { ...task, status: statusMap[to] };
      return {
        ...prev,
        [from]: prev[from].filter((t) => t.id !== taskId),
        [to]: [...prev[to], updated],
      };
    });
  }, []);

  const addTask = useCallback((columnId: KanbanColumnId, task: Partial<TaskItem>) => {
    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      subject: task.subject || 'New Task',
      description: task.description || '',
      activeForm: task.activeForm || '',
      owner: task.owner || '',
      status: task.status || 'pending',
      blocks: task.blocks || [],
      blockedBy: task.blockedBy || [],
      metadata: task.metadata || {},
    };

    setColumns((prev) => ({
      ...prev,
      [columnId]: [...prev[columnId], newTask],
    }));
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setColumns((prev) => {
      const next = { ...prev };
      for (const col of COLUMN_ORDER) {
        next[col] = prev[col].filter((t) => t.id !== taskId);
      }
      return next;
    });
  }, []);

  const editTask = useCallback((taskId: string, updates: Partial<TaskItem>) => {
    setColumns((prev) => {
      const next = { ...prev };
      for (const col of COLUMN_ORDER) {
        next[col] = prev[col].map((t) =>
          t.id === taskId ? { ...t, ...updates } : t
        );
      }
      return next;
    });
  }, []);

  const importTodos = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const todos: TaskItem[] = await window.api.extractTodos(path);
      if (todos.length === 0) return;

      setColumns((prev) => {
        const next = { ...prev };
        // Avoid importing duplicates by subject
        const existingSubjects = new Set(
          COLUMN_ORDER.flatMap((col) => prev[col].map((t) => t.subject))
        );

        for (const todo of todos) {
          if (existingSubjects.has(todo.subject)) continue;
          const col = statusToColumn(todo.status);
          next[col] = [...next[col], todo];
          existingSubjects.add(todo.subject);
        }
        return next;
      });
    } catch {
      // Failed to extract — silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    columns,
    moveTask,
    addTask,
    removeTask,
    editTask,
    importTodos,
    dragState,
    setDragState,
    isLoading,
  };
}
