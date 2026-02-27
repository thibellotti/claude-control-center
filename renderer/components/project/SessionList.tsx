import React from 'react';
import { useSessions } from '../../hooks/useSettings';

interface SessionListProps {
  projectPath: string;
}

function formatSessionDate(timestamp: number): { date: string; time: string } {
  const d = new Date(timestamp);
  return {
    date: d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export default function SessionList({ projectPath }: SessionListProps) {
  const { sessions, loading } = useSessions(projectPath);

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <div className="flex items-center gap-2 text-text-tertiary text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse" />
          Loading sessions...
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-text-tertiary text-sm">No sessions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 py-6">
      {sessions.map((session, idx) => {
        const { date, time } = formatSessionDate(session.timestamp);
        return (
          <div
            key={session.sessionId || idx}
            className="flex items-center gap-4 px-4 py-3 bg-surface-1 border border-border-subtle rounded-card hover:border-border-default transition-colors"
          >
            <div className="shrink-0 text-right w-24">
              <p className="text-xs text-text-secondary">{date}</p>
              <p className="text-[11px] text-text-tertiary">{time}</p>
            </div>
            <div className="w-px h-8 bg-border-subtle" />
            <p className="text-sm text-text-secondary truncate flex-1">
              {session.display}
            </p>
          </div>
        );
      })}
    </div>
  );
}
