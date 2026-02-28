import React from 'react';
import type { TaskItem } from '../../../shared/types';

interface TaskListProps {
  tasks: TaskItem[];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  in_progress: {
    label: 'In Progress',
    color: 'text-accent',
    bgColor: 'bg-accent-muted',
    dotColor: 'bg-accent',
  },
  pending: {
    label: 'Pending',
    color: 'text-status-dirty',
    bgColor: 'bg-status-dirty/10',
    dotColor: 'bg-status-dirty',
  },
  completed: {
    label: 'Completed',
    color: 'text-status-active',
    bgColor: 'bg-status-active/10',
    dotColor: 'bg-status-active',
  },
};

function TaskCard({ task }: { task: TaskItem }) {
  return (
    <div className="bg-surface-1 border border-border-subtle rounded-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <h4 className="text-sm font-medium text-text-primary truncate min-w-0">{task.subject}</h4>
        {task.owner && (
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-surface-3 text-micro font-mono text-text-tertiary">
            {task.owner}
          </span>
        )}
      </div>
      {task.description && (
        <p className="text-xs text-text-tertiary line-clamp-2">{task.description}</p>
      )}
      {(task.blocks.length > 0 || task.blockedBy.length > 0) && (
        <div className="flex flex-wrap gap-2 text-micro">
          {task.blockedBy.length > 0 && (
            <span className="text-status-dirty">
              Blocked by: {task.blockedBy.join(', ')}
            </span>
          )}
          {task.blocks.length > 0 && (
            <span className="text-text-tertiary">
              Blocks: {task.blocks.join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-text-tertiary text-sm">No tasks found.</p>
      </div>
    );
  }

  // Filter out deleted tasks
  const visibleTasks = tasks.filter((t) => t.status !== 'deleted');

  const groups = [
    { status: 'in_progress', tasks: visibleTasks.filter((t) => t.status === 'in_progress') },
    { status: 'pending', tasks: visibleTasks.filter((t) => t.status === 'pending') },
    { status: 'completed', tasks: visibleTasks.filter((t) => t.status === 'completed') },
  ].filter((g) => g.tasks.length > 0);

  return (
    <div className="space-y-6 py-6">
      {groups.map((group) => {
        const config = STATUS_CONFIG[group.status];
        return (
          <section key={group.status}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                {config.label}
              </span>
              <span className={`px-1.5 py-0.5 rounded-full text-micro font-medium ${config.bgColor} ${config.color}`}>
                {group.tasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {group.tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
