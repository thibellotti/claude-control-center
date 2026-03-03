import React from 'react';
import type { ActiveSession } from '../../../shared/types';

interface ActiveSessionsProps {
  sessions?: ActiveSession[];
  onJumpToSession?: (projectPath: string) => void;
}

// process.env.HOME is undefined in Electron renderer sandbox mode;
// fall back gracefully so paths still display without throwing.
const HOME =
  (typeof process !== 'undefined' && (process.env.HOME || process.env.USERPROFILE)) || '';

function shortenPath(path: string): string {
  if (HOME && path.startsWith(HOME)) {
    return '~' + path.slice(HOME.length);
  }
  return path;
}

function isHomeDir(path: string): boolean {
  if (!HOME) return false;
  return path === HOME || path === HOME + '/';
}

function getDisplayName(session: ActiveSession): string {
  // If cwd is just the home directory, use the session label as the name
  if (isHomeDir(session.projectPath) && session.sessionLabel) {
    return session.sessionLabel;
  }
  return session.projectName;
}

function getSubtitle(session: ActiveSession): string | null {
  // If cwd is home dir, the label is already shown as the name — show "~" as subtitle
  if (isHomeDir(session.projectPath)) {
    return '~';
  }
  // Otherwise show the session label as subtitle
  return session.sessionLabel || null;
}

export default function ActiveSessions({ sessions, onJumpToSession }: ActiveSessionsProps) {
  if (!sessions || sessions.length === 0) {
    return (
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
          Live Sessions
        </h2>
        <p className="text-xs text-text-tertiary">No active sessions</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-4">
        Live Sessions ({sessions.length})
      </h2>
      <div className="bg-surface-2 border border-border-subtle rounded-card divide-y divide-border-subtle">
        {sessions.map((session) => {
          const displayName = getDisplayName(session);
          const subtitle = getSubtitle(session);

          return (
            <div
              key={session.pid}
              role={onJumpToSession ? 'button' : undefined}
              tabIndex={onJumpToSession ? 0 : undefined}
              onClick={() => onJumpToSession?.(session.projectPath)}
              onKeyDown={onJumpToSession ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onJumpToSession(session.projectPath);
                }
              } : undefined}
              className={`flex items-center gap-3 px-4 py-3${onJumpToSession ? ' cursor-pointer hover:bg-surface-3 transition-colors duration-150' : ''}`}
            >
              {/* Pulsing live indicator */}
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-status-active" />
              </span>

              {/* Session info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-text-primary truncate" title={displayName}>
                    {displayName}
                  </span>
                  <span className="text-xs text-text-tertiary font-mono shrink-0">
                    PID {session.pid}
                  </span>
                </div>
                {subtitle && (
                  <p className="text-xs text-text-secondary truncate mt-1">
                    {subtitle}
                  </p>
                )}
                {!isHomeDir(session.projectPath) && (
                  <p className="text-micro text-text-tertiary font-mono truncate mt-1" title={session.projectPath}>
                    {shortenPath(session.projectPath)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
