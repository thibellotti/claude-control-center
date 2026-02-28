import React, { memo } from 'react';
import type { ProjectHealth } from '../../../shared/types';

interface HealthBadgeProps {
  health: ProjectHealth;
  compact?: boolean;
}

function formatDaysAgo(days: number): string {
  if (days > 30) {
    const months = Math.round(days / 30);
    return `${months}mo ago`;
  }
  return `${days}d ago`;
}

// Compact mode: small indicators with tooltips for ProjectCard
function CompactIndicators({ health }: { health: ProjectHealth }) {
  const indicators: React.ReactNode[] = [];

  if (health.uncommittedCount > 0) {
    indicators.push(
      <span
        key="uncommitted"
        className="text-status-dirty cursor-default leading-none"
        title={`${health.uncommittedCount} uncommitted file${health.uncommittedCount !== 1 ? 's' : ''}`}
      >
        ●
      </span>
    );
  }

  if (health.daysSinceLastCommit !== null && health.daysSinceLastCommit > 7) {
    indicators.push(
      <span
        key="stale"
        className="text-text-tertiary cursor-default leading-none"
        title={`Last commit ${formatDaysAgo(health.daysSinceLastCommit)}`}
      >
        ◷
      </span>
    );
  }

  if (health.hasOutdatedDeps) {
    indicators.push(
      <span
        key="deps"
        className="text-status-dirty cursor-default leading-none"
        title="Outdated dependencies"
      >
        ▲
      </span>
    );
  }

  if (indicators.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-micro">
      {indicators}
    </div>
  );
}

// Full mode: readable pills for ProjectOverview
function FullIndicators({ health }: { health: ProjectHealth }) {
  const pills: React.ReactNode[] = [];

  if (health.uncommittedCount > 0) {
    pills.push(
      <span
        key="uncommitted"
        className="inline-flex items-center px-2 py-0.5 rounded bg-surface-3 text-[11px] text-status-dirty"
      >
        {health.uncommittedCount} uncommitted file{health.uncommittedCount !== 1 ? 's' : ''}
      </span>
    );
  }

  if (health.daysSinceLastCommit !== null && health.daysSinceLastCommit > 7) {
    pills.push(
      <span
        key="stale"
        className="inline-flex items-center px-2 py-0.5 rounded bg-surface-3 text-[11px] text-text-tertiary"
      >
        {formatDaysAgo(health.daysSinceLastCommit)} since commit
      </span>
    );
  }

  if (health.hasOutdatedDeps) {
    pills.push(
      <span
        key="deps"
        className="inline-flex items-center px-2 py-0.5 rounded bg-surface-3 text-[11px] text-status-dirty"
      >
        outdated deps
      </span>
    );
  }

  if (pills.length === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-3 text-[11px] text-status-clean">
        all good
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {pills}
    </div>
  );
}

export default memo(function HealthBadge({ health, compact = false }: HealthBadgeProps) {
  if (compact) {
    return <CompactIndicators health={health} />;
  }
  return <FullIndicators health={health} />;
})
