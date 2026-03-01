import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveFeed } from '../../hooks/useTerminal';
import type { TaskItem } from '../../../shared/types';
import TaskList from '../project/TaskList';
import { FeedIcon, LayersIcon } from '../icons';

interface OrchestratorDrawerProps {
  open: boolean;
  projectPath: string | null;
  tasks: TaskItem[];
}

type DrawerTab = 'feed' | 'tasks';

function FeedContent({ projectPath }: { projectPath: string | null }) {
  const liveFeed = useLiveFeed();

  useEffect(() => {
    liveFeed.start();
    return () => liveFeed.stop();
  }, []);

  const filtered = useMemo(
    () =>
      projectPath
        ? liveFeed.entries.filter((e) => e.projectPath === projectPath)
        : liveFeed.entries,
    [liveFeed.entries, projectPath]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered.length]);

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-text-tertiary">Waiting for activity...</p>
          </div>
        ) : (
          filtered.map((entry, i) => (
            <div
              key={`${entry.timestamp}-${i}`}
              className="flex items-start gap-1.5 px-2.5 py-1 border-b border-border-subtle/20"
            >
              <span className="text-micro font-mono text-text-tertiary shrink-0 mt-px w-[50px]">
                {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <p className="text-micro text-text-secondary leading-snug break-words min-w-0">
                {entry.summary}
              </p>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between px-2.5 py-1 border-t border-border-subtle bg-surface-0 shrink-0">
        <span className="text-micro text-text-tertiary">{filtered.length} events</span>
        {filtered.length > 0 && (
          <span className="text-micro text-status-active font-medium">Live</span>
        )}
      </div>
    </div>
  );
}

function TasksContent({ tasks }: { tasks: TaskItem[] }) {
  return (
    <div className="h-full overflow-y-auto px-2">
      <TaskList tasks={tasks} />
    </div>
  );
}

export default function OrchestratorDrawer({ open, projectPath, tasks }: OrchestratorDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('feed');

  return (
    <div
      className={`shrink-0 border-l border-border-subtle bg-surface-0 transition-all duration-200 overflow-hidden ${
        open ? 'w-80' : 'w-0 border-l-0'
      }`}
    >
      {open && (
        <div className="flex flex-col h-full w-80">
          {/* Tabs */}
          <div className="flex border-b border-border-subtle shrink-0">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center gap-1.5 flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'feed'
                  ? 'bg-surface-1 text-text-primary border-b-2 border-accent'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <FeedIcon size={12} />
              Feed
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-1.5 flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'tasks'
                  ? 'bg-surface-1 text-text-primary border-b-2 border-accent'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <LayersIcon size={12} />
              Tasks
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0">
            {activeTab === 'feed' ? (
              <FeedContent projectPath={projectPath} />
            ) : (
              <TasksContent tasks={tasks} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
