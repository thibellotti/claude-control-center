import React from 'react';

export interface StatCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
  warn?: boolean;
  /** Use 'compact' for smaller cards (e.g. ProjectDetail), 'default' for larger cards (e.g. Dashboard) */
  size?: 'default' | 'compact';
}

export default function StatCard({ label, value, accent, warn, size = 'default' }: StatCardProps) {
  let valueColor = 'text-text-primary';
  if (accent) valueColor = 'text-accent';
  if (warn) valueColor = 'text-status-dirty';

  const isCompact = size === 'compact';

  return (
    <div
      className={`flex-1 bg-surface-1 border border-border-subtle rounded-card ${
        isCompact ? 'min-w-[120px] p-3' : 'min-w-[140px] p-4'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-1">
        {label}
      </p>
      <p className={`${isCompact ? 'text-lg' : 'text-2xl'} font-semibold ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}
