import React from 'react';
import type { Team } from '../../../shared/types';

interface TeamViewProps {
  teams: Team[];
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TeamView({ teams }: TeamViewProps) {
  if (teams.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-text-tertiary text-sm">No teams found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-6">
      {teams.map((team) => (
        <div
          key={team.name}
          className="bg-surface-1 border border-border-subtle rounded-card p-4 space-y-4"
        >
          {/* Team header */}
          <div>
            <div className="flex items-center justify-between gap-2 min-w-0">
              <h4 className="text-sm font-semibold text-text-primary truncate">{team.name}</h4>
              <span className="text-[11px] text-text-tertiary">
                {formatDate(team.createdAt)}
              </span>
            </div>
            {team.description && (
              <p className="text-xs text-text-tertiary mt-1">{team.description}</p>
            )}
          </div>

          {/* Members list */}
          {team.members.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                Members
              </span>
              <div className="space-y-1.5">
                {team.members.map((member) => (
                  <div
                    key={member.agentId}
                    className="flex items-center gap-3 px-3 py-2 bg-surface-2 rounded-button min-w-0"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: member.color || '#6B7280' }}
                    />
                    <span className="text-sm text-text-primary font-medium truncate">
                      {member.name}
                    </span>
                    <span className="text-[11px] text-text-tertiary font-mono shrink-0">
                      {member.agentType}
                    </span>
                    {member.model && (
                      <span className="text-[10px] text-text-tertiary ml-auto">
                        {member.model}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
