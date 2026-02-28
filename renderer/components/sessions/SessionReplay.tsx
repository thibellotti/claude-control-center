import React, { useState, useMemo } from 'react';
import { useSessionReplay } from '../../hooks/useSessionReplay';
import TimelineEvent from './TimelineEvent';
import type { SessionAction, SessionTimeline } from '../../../shared/types';
import { ChevronLeftIcon, ClockIcon } from '../icons';

interface SessionReplayProps {
  projectPath: string;
}

type FilterType = 'all' | 'files' | 'commands' | 'text';

// --- Helpers ---

function formatSessionDate(timestamp: string): { date: string; time: string } {
  try {
    const d = new Date(timestamp);
    return {
      date: d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      time: d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  } catch {
    return { date: '', time: '' };
  }
}

function formatTimeRange(start: string, end: string): string {
  const s = formatSessionDate(start);
  const e = formatSessionDate(end);

  if (s.date === e.date) {
    return `${s.date} ${s.time} - ${e.time}`;
  }
  return `${s.date} ${s.time} - ${e.date} ${e.time}`;
}

function filterActions(actions: SessionAction[], filter: FilterType): SessionAction[] {
  if (filter === 'all') return actions;
  if (filter === 'files') {
    return actions.filter((a) =>
      a.type === 'file_read' || a.type === 'file_write' || a.type === 'file_edit'
    );
  }
  if (filter === 'commands') {
    return actions.filter((a) => a.type === 'command');
  }
  if (filter === 'text') {
    return actions.filter((a) => a.type === 'text');
  }
  return actions;
}

// --- Sub-components ---

function SessionCard({
  session,
  isSelected,
  onClick,
}: {
  session: SessionTimeline;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { date, time } = formatSessionDate(session.startTime);

  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-4 py-3 rounded-card border text-left transition-colors min-w-[140px] ${
        isSelected
          ? 'border-accent bg-accent-muted'
          : 'border-border-subtle bg-surface-1 hover:border-border-default'
      }`}
    >
      <p className="text-sm font-medium text-text-primary">{date}</p>
      <p className="text-xs text-text-tertiary mt-0.5">{time}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[11px] text-text-tertiary">{session.actionCount} entries</span>
      </div>
    </button>
  );
}

function FilterBar({
  filter,
  onChange,
  counts,
}: {
  filter: FilterType;
  onChange: (f: FilterType) => void;
  counts: Record<FilterType, number>;
}) {
  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'files', label: 'Files' },
    { id: 'commands', label: 'Commands' },
    { id: 'text', label: 'Text' },
  ];

  return (
    <div className="flex items-center gap-1">
      {filters.map((f) => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          className={`px-3 py-1.5 rounded-button text-xs font-medium transition-colors ${
            filter === f.id
              ? 'bg-accent text-white'
              : 'bg-surface-2 text-text-tertiary hover:text-text-secondary'
          }`}
        >
          {f.label}
          {counts[f.id] > 0 && (
            <span className="ml-1.5 opacity-70">{counts[f.id]}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// --- Main Component ---

export default function SessionReplay({ projectPath }: SessionReplayProps) {
  const {
    sessions,
    selectedSession,
    selectSession,
    clearSelection,
    isLoadingList,
    isLoadingDetail,
  } = useSessionReplay(projectPath);

  const [filter, setFilter] = useState<FilterType>('all');

  // Compute filtered actions
  const filteredActions = useMemo(() => {
    if (!selectedSession?.actions) return [];
    return filterActions(selectedSession.actions, filter);
  }, [selectedSession, filter]);

  // Compute filter counts
  const filterCounts = useMemo((): Record<FilterType, number> => {
    const actions = selectedSession?.actions || [];
    return {
      all: actions.length,
      files: actions.filter((a) =>
        a.type === 'file_read' || a.type === 'file_write' || a.type === 'file_edit'
      ).length,
      commands: actions.filter((a) => a.type === 'command').length,
      text: actions.filter((a) => a.type === 'text').length,
    };
  }, [selectedSession]);

  // --- Loading state ---
  if (isLoadingList) {
    return (
      <div className="py-16 flex items-center justify-center">
        <div className="flex items-center gap-2 text-text-tertiary text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse" />
          Loading sessions...
        </div>
      </div>
    );
  }

  // --- Empty state ---
  if (sessions.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="text-text-tertiary">
            <ClockIcon />
          </span>
          <p className="text-text-tertiary text-sm">
            No session recordings found for this project.
          </p>
          <p className="text-text-tertiary text-xs max-w-[320px]">
            Sessions are recorded automatically when you use Claude Code in this project directory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-4">
      {/* Session detail view */}
      {selectedSession ? (
        <div className="space-y-4">
          {/* Header with back button */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={clearSelection}
                className="shrink-0 p-1.5 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
                title="Back to session list"
              >
                <ChevronLeftIcon />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {formatTimeRange(selectedSession.startTime, selectedSession.endTime)}
                </p>
                <p className="text-xs text-text-tertiary font-mono truncate mt-0.5">
                  {selectedSession.fileName}
                </p>
              </div>
            </div>
            <FilterBar filter={filter} onChange={setFilter} counts={filterCounts} />
          </div>

          {/* Loading detail */}
          {isLoadingDetail ? (
            <div className="py-12 flex items-center justify-center">
              <div className="flex items-center gap-2 text-text-tertiary text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse" />
                Loading timeline...
              </div>
            </div>
          ) : filteredActions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-text-tertiary text-sm">
                No actions match the current filter.
              </p>
            </div>
          ) : (
            /* Timeline */
            <div className="pl-2">
              {filteredActions.map((action, idx) => (
                <TimelineEvent
                  key={action.id}
                  action={action}
                  isLast={idx === filteredActions.length - 1}
                />
              ))}
              {selectedSession.actions.length >= 500 && (
                <p className="text-xs text-text-tertiary mt-4 pl-10">
                  Showing first 500 actions. Older actions are truncated.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Session list view */
        <div>
          <p className="text-xs text-text-tertiary mb-3">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded. Select one to replay.
          </p>
          <div className="flex flex-wrap gap-2">
            {sessions.map((session) => (
              <SessionCard
                key={session.sessionId}
                session={session}
                isSelected={false}
                onClick={() => selectSession(session.sessionId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
