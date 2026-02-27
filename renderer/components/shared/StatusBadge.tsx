import React from 'react';

interface StatusBadgeProps {
  status: 'active' | 'idle';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const isActive = status === 'active';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
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
}
