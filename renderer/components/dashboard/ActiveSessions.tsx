import React from 'react';
import type { ActiveSession } from '../../../shared/types';

interface ActiveSessionsProps {
  sessions?: ActiveSession[];
}

function shortenPath(path: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || '~';
  if (path.startsWith(home)) {
    return '~' + path.slice(home.length);
  }
  return path;
}

export default function ActiveSessions({ sessions }: ActiveSessionsProps) {
  if (!sessions || sessions.length === 0) return null;

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-4">
        Live Sessions ({sessions.length})
      </h2>
      <div className="bg-surface-2 border border-border-subtle rounded-card divide-y divide-border-subtle">
        {sessions.map((session) => (
          <div key={session.pid} className="flex items-center gap-3 px-4 py-3">
            {/* Pulsing live indicator */}
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-active" />
            </span>

            {/* Session info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary truncate">
                  {session.projectName}
                </span>
                <span className="text-xs text-text-tertiary font-mono flex-shrink-0">
                  PID {session.pid}
                </span>
              </div>
              <p className="text-[10px] text-text-tertiary font-mono truncate mt-0.5">
                {shortenPath(session.projectPath)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
