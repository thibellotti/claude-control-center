import React from 'react';

// ---------------------------------------------------------------------------
// Shared icon props
// ---------------------------------------------------------------------------

interface IconProps {
  size?: number;
  className?: string;
}

const defaults = { size: 14, className: '' };

function p(props: IconProps) {
  return { ...defaults, ...props };
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export function ChevronLeftIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronUpIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 7.5L6 4.5L9 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DragHandleIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="4" cy="2.5" r="1" fill="currentColor" />
      <circle cx="8" cy="2.5" r="1" fill="currentColor" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="8" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="9.5" r="1" fill="currentColor" />
      <circle cx="8" cy="9.5" r="1" fill="currentColor" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sidebar / App
// ---------------------------------------------------------------------------

export function DashboardIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function PromptsIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="2" y="1.5" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 5h4M5 8h4M5 11h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 4.5h1.5a1 1 0 011 1v9a1 1 0 01-1 1H6a1 1 0 01-1-1V14" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function WorkspacesIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="1" y="1" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="7" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="7" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="13" width="14" height="2" rx="0.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function UsageIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="1.5" y="9" width="3" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="6.5" y="5" width="3" height="9.5" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="11.5" y="1.5" width="3" height="13" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Terminal
// ---------------------------------------------------------------------------

export function TerminalIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 6l2 1.5L4 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function ConsoleIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 5l2.5 2L3 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function ClaudeIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 5l2.5 2L4 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 9H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function SearchIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M11.5 7A4.5 4.5 0 1 1 9.25 3M11.5 2v3h-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExternalLinkIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M10.5 7.5v3a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 2.5h3.5V6M6 8l5.5-5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CopyIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M9.5 4.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function TrashIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M2.5 3.5h7M4.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M5 5.5v3M7 5.5v3M3.5 3.5l.5 6a1 1 0 001 1h2a1 1 0 001-1l.5-6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M7 2v7M4 7l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 7.5l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InfoIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 6.5V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="7" cy="4.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Media controls
// ---------------------------------------------------------------------------

export function PlayIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 1.5v9l7.5-4.5L3 1.5z" fill="currentColor" />
    </svg>
  );
}

export function StopIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor" />
    </svg>
  );
}

export function PlayCircleIcon(props: IconProps = {}) {
  const { size = 32, className } = { ...props };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 11v10l8-5-8-5z" fill="currentColor" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Viewport
// ---------------------------------------------------------------------------

export function DesktopIcon({ active, ...props }: IconProps & { active?: boolean }) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="1.5" y="2" width="13" height="9" rx="1" stroke="currentColor" strokeWidth={active ? '1.5' : '1.2'} />
      <path d="M5.5 14h5M8 11v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function TabletIcon({ active, ...props }: IconProps & { active?: boolean }) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="3" y="1.5" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth={active ? '1.5' : '1.2'} />
      <circle cx="8" cy="12.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function MobileIcon({ active, ...props }: IconProps & { active?: boolean }) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="4" y="1.5" width="8" height="13" rx="1.5" stroke="currentColor" strokeWidth={active ? '1.5' : '1.2'} />
      <circle cx="8" cy="12.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Status / Feedback
// ---------------------------------------------------------------------------

export function SpinnerIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg className={`animate-spin ${className}`} width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ErrorCircleIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 4.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="7" cy="9.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function StarIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M7 1.5l1.64 3.32 3.66.54-2.65 2.58.63 3.64L7 9.77l-3.28 1.81.63-3.64L1.7 5.36l3.66-.54L7 1.5z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Timeline / Session
// ---------------------------------------------------------------------------

export function EyeIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function PencilIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M8.5 2.5l3 3M2 9.5l6.5-6.5 3 3L5 12.5H2v-3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChatIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M2 2.5h10a1 1 0 011 1v6a1 1 0 01-1 1H5l-3 2v-2a1 1 0 01-1-1v-6a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Git / VCS
// ---------------------------------------------------------------------------

export function BranchIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="4" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 4.5v3M6.5 5L4 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function CommitIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 1v3M6 8v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function PRIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="3.5" cy="3" r="1.5" stroke="currentColor" strokeWidth="1" />
      <circle cx="8.5" cy="9" r="1.5" stroke="currentColor" strokeWidth="1" />
      <path d="M3.5 4.5v4M8.5 7.5v-3a2 2 0 0 0-2-2H5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Platform / Integration
// ---------------------------------------------------------------------------

export function GitHubIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path fillRule="evenodd" clipRule="evenodd" d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8c0 2.87 1.86 5.3 4.44 6.16.33.06.44-.14.44-.31v-1.2c-1.81.39-2.19-.87-2.19-.87-.3-.75-.72-.95-.72-.95-.59-.4.04-.4.04-.4.65.05 1 .67 1 .67.58.99 1.52.7 1.89.54.06-.42.23-.7.41-.86-1.44-.16-2.96-.72-2.96-3.21 0-.71.25-1.29.67-1.75-.07-.16-.29-.82.06-1.72 0 0 .55-.17 1.79.67A6.2 6.2 0 0 1 8 5.55c.55.003 1.11.075 1.63.22 1.24-.84 1.79-.67 1.79-.67.35.9.13 1.56.06 1.72.42.46.67 1.04.67 1.75 0 2.5-1.52 3.05-2.97 3.21.23.2.44.6.44 1.2v1.79c0 .17.12.37.45.31A7.5 7.5 0 0 0 14.5 8c0-3.59-2.91-6.5-6.5-6.5z" fill="currentColor" />
    </svg>
  );
}

export function VercelIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M8 3L14 13H2L8 3z" fill="currentColor" />
    </svg>
  );
}

export function NetlifyIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="2" y="2" width="5" height="5" rx="0.5" fill="currentColor" />
      <rect x="9" y="2" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.7" />
      <rect x="2" y="9" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.7" />
      <rect x="9" y="9" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function DatabaseIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <ellipse cx="8" cy="4" rx="5" ry="2.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 4v8c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2V4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 8c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function FigmaIcon(props: IconProps = {}) {
  const { size = 32, className } = { ...props };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="6" y="4" width="8" height="8" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="18" y="4" width="8" height="8" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6" y="12" width="8" height="8" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6" y="20" width="8" height="8" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="22" cy="16" r="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Large / Decorative
// ---------------------------------------------------------------------------

export function RocketIcon(props: IconProps = {}) {
  const { size = 32, className } = { ...props };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M16 4c-4 4-6 10-6 14l3 3c4-2 10-4 14-6C27 15 27 4 16 4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="19" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 18l-3 3 2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 22l-3 3 2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PackageIcon(props: IconProps = {}) {
  const { size = 32, className } = { ...props };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M16 4L28 10v12L16 28 4 22V10l12-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M16 16v12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M28 10L16 16 4 10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 7l12 6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function LayersIcon(props: IconProps = {}) {
  const { size = 32, className } = { ...props };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M4 12l12 6 12-6-12-6-12 6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 18l12 6 12-6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 24l12 6 12-6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function CameraIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M5 2l-1 2H2a1 1 0 00-1 1v6a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1h-2l-1-2H5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="7" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function ComponentsEmptyIcon(props: IconProps = {}) {
  const { size = 32, className } = { ...props };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="4" y="4" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="18" y="4" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4" y="18" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="18" y="18" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

export function BoardEmptyIcon(props: IconProps = {}) {
  const { size = 48, className } = { ...props };
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4" y="26" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="28" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="28" y="26" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12h0M12 32h0M36 12h0M36 32h0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function EditIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M7.5 2L10 4.5M1.5 8.5L7 3L10 6L4.5 11.5H1.5V8.5Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RemoveIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

export function EyeOffIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M2 2l10 10M5.6 5.6a2 2 0 002.8 2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4.3C2.6 5.3 1 7 1 7s2.5 4 6 4c1 0 1.9-.3 2.7-.7M9.8 9.8c1.3-1 2.8-2.8 3.2-2.8-1-2.5-3-4-6-4-.5 0-1 .1-1.5.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Feed / Terminal
// ---------------------------------------------------------------------------

export function FeedIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M2 3h10M2 6h8M2 9h10M2 12h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Time / Sessions
// ---------------------------------------------------------------------------

export function ClockIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Editor / Files
// ---------------------------------------------------------------------------

export function SaveIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M11 12.5H3a1 1 0 01-1-1v-9a1 1 0 011-1h6.5L12 4v7.5a1 1 0 01-1 1z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.5 12.5v-3.5h-5v3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 1.5v3h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TokenFileIcon(props: IconProps = {}) {
  const { size = 32, className } = { ...props };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="6" y="4" width="20" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 16h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 20h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CodeViewIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M4.5 4L1.5 7L4.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 4L12.5 7L9.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 2L6 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function FileIcon(props: IconProps = {}) {
  const { size = 32, className } = { ...props };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M20 4H8C7.46957 4 6.96086 4.21071 6.58579 4.58579C6.21071 4.96086 6 5.46957 6 6V26C6 26.5304 6.21071 27.0391 6.58579 27.4142C6.96086 27.7893 7.46957 28 8 28H24C24.5304 28 25.0391 27.7893 25.4142 27.4142C25.7893 27.0391 26 26.5304 26 26V10L20 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 4V10H26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 20H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Platform / Integration (continued)
// ---------------------------------------------------------------------------

export function SupabaseIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M10.2 16.8c-.4.5-1.2.2-1.2-.5V10h6.3c.9 0 1.4 1 .8 1.7L10.2 16.8z" fill="#3ECF8E" />
      <path d="M10.2 16.8c-.4.5-1.2.2-1.2-.5V10h6.3c.9 0 1.4 1 .8 1.7L10.2 16.8z" fill="url(#sb_a)" fillOpacity=".2" />
      <path d="M7.8 1.2C8.2.7 9 1 9 1.7V8H2.7c-.9 0-1.4-1-.8-1.7L7.8 1.2z" fill="#3ECF8E" />
      <defs>
        <linearGradient id="sb_a" x1="9" y1="10" x2="13" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#249361" />
          <stop offset="1" stopColor="#3ECF8E" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BarChartIcon(props: IconProps = {}) {
  const { size, className } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="2" y="12" width="3" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="7" y="8" width="3" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="12" y="5" width="3" height="13" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
