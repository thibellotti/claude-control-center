import React from 'react';

interface GitBadgeProps {
  branch: string;
  status: 'clean' | 'dirty';
}

function BranchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="4" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 4.5v3M6.5 5L4 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function GitBadge({ branch, status }: GitBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-3 text-[11px] font-mono text-text-secondary">
      <BranchIcon />
      <span className="truncate max-w-[120px]">{branch}</span>
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          status === 'clean' ? 'bg-status-clean' : 'bg-status-dirty'
        }`}
        title={status === 'clean' ? 'Clean' : 'Uncommitted changes'}
      />
    </span>
  );
}
