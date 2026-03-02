import React, { memo } from 'react';

interface StatusBadgeProps {
  status: 'active' | 'idle';
}

export default memo(function StatusBadge({ status }: StatusBadgeProps) {
  const isActive = status === 'active';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        isActive
          ? 'bg-status-active/10 text-status-active'
          : 'bg-status-idle/10 text-status-idle'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? 'bg-status-active' : 'bg-status-idle'
        }`}
      />
      {isActive ? 'Active' : 'Idle'}
    </span>
  );
})
