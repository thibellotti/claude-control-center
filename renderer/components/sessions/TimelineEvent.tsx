import React, { memo, useState } from 'react';
import type { SessionAction } from '../../../shared/types';
import { EyeIcon, PlusIcon, PencilIcon, TerminalIcon, ChatIcon, ErrorCircleIcon, ChevronDownIcon } from '../icons';

interface TimelineEventProps {
  action: SessionAction;
  isLast: boolean;
}

// --- Style maps ---

const dotColorMap: Record<SessionAction['type'], string> = {
  file_read: 'bg-text-tertiary',
  file_write: 'bg-status-active',
  file_edit: 'bg-accent',
  command: 'bg-status-dirty',
  text: 'bg-text-secondary',
  error: 'bg-feedback-error',
};

const iconColorMap: Record<SessionAction['type'], string> = {
  file_read: 'text-text-tertiary',
  file_write: 'text-status-active',
  file_edit: 'text-accent',
  command: 'text-status-dirty',
  text: 'text-text-secondary',
  error: 'text-feedback-error',
};

const iconMap: Record<SessionAction['type'], React.FC> = {
  file_read: EyeIcon,
  file_write: PlusIcon,
  file_edit: PencilIcon,
  command: TerminalIcon,
  text: ChatIcon,
  error: ErrorCircleIcon,
};

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

export default memo(function TimelineEvent({ action, isLast }: TimelineEventProps) {
  const [expanded, setExpanded] = useState(false);

  const IconComponent = iconMap[action.type];
  const dotColor = dotColorMap[action.type];
  const iconColor = iconColorMap[action.type];
  const hasDetail = !!action.detail;

  return (
    <div className="flex gap-4 min-w-0">
      {/* Left side: timeline line and dot */}
      <div className="flex flex-col items-center shrink-0 w-6">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${dotColor}`} />
        {!isLast && <div className="w-[2px] flex-1 bg-border-subtle mt-1" />}
      </div>

      {/* Right side: content */}
      <div className={`flex-1 min-w-0 ${isLast ? 'pb-2' : 'pb-4'}`}>
        <div className="flex items-start gap-2 min-w-0">
          <span className={`shrink-0 mt-0.5 ${iconColor}`}>
            <IconComponent />
          </span>

          <div className="flex-1 min-w-0">
            {/* Description row */}
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-sm text-text-secondary truncate">
                {action.description}
              </p>
              {hasDetail && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="shrink-0 p-0.5 rounded text-text-tertiary hover:text-text-secondary transition-colors"
                  title={expanded ? 'Collapse' : 'Expand'}
                >
                  <ChevronDownIcon className={`transition-transform ${expanded ? 'rotate-180' : ''}`} size={12} />
                </button>
              )}
            </div>

            {/* File path */}
            {action.filePath && (
              <p className="text-xs font-mono text-text-tertiary truncate mt-0.5">
                {action.filePath}
              </p>
            )}

            {/* Timestamp */}
            <p className="text-xs text-text-tertiary mt-0.5">
              {formatTime(action.timestamp)}
            </p>

            {/* Expandable detail */}
            {hasDetail && expanded && (
              <div className="mt-2 p-3 bg-surface-2 border border-border-subtle rounded-card">
                <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-all leading-relaxed">
                  {action.detail}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
})
