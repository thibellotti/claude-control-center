import React, { memo } from 'react';
import { BranchIcon } from '../icons';

interface GitBadgeProps {
  branch: string;
  status: 'clean' | 'dirty';
}

export default memo(function GitBadge({ branch, status }: GitBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-3 text-[11px] font-mono text-text-secondary min-w-0 overflow-hidden max-w-[150px]">
      <BranchIcon size={12} />
      <span className="truncate">{branch}</span>
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          status === 'clean' ? 'bg-status-clean' : 'bg-status-dirty'
        }`}
        title={status === 'clean' ? 'Clean' : 'Uncommitted changes'}
      />
    </span>
  );
})
