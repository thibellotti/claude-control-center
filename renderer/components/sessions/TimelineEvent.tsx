import React, { useState } from 'react';
import type { SessionAction } from '../../../shared/types';

interface TimelineEventProps {
  action: SessionAction;
  isLast: boolean;
}

// --- Icons ---

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8.5 2.5l3 3M2 9.5l6.5-6.5 3 3L5 12.5H2v-3z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 6l2 1.5L4 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 2.5h10a1 1 0 011 1v6a1 1 0 01-1 1H5l-3 2v-2a1 1 0 01-1-1v-6a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 4.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="7" cy="9.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function ChevronDownIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}
    >
      <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// --- Style maps ---

const dotColorMap: Record<SessionAction['type'], string> = {
  file_read: 'bg-text-tertiary',
  file_write: 'bg-status-active',
  file_edit: 'bg-accent',
  command: 'bg-status-dirty',
  text: 'bg-text-secondary',
  error: 'bg-red-500',
};

const iconColorMap: Record<SessionAction['type'], string> = {
  file_read: 'text-text-tertiary',
  file_write: 'text-status-active',
  file_edit: 'text-accent',
  command: 'text-status-dirty',
  text: 'text-text-secondary',
  error: 'text-red-500',
};

const iconMap: Record<SessionAction['type'], React.FC> = {
  file_read: EyeIcon,
  file_write: PlusIcon,
  file_edit: PencilIcon,
  command: TerminalIcon,
  text: ChatIcon,
  error: ErrorIcon,
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

export default function TimelineEvent({ action, isLast }: TimelineEventProps) {
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
                  <ChevronDownIcon expanded={expanded} />
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
}
