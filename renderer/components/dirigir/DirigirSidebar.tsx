import React from 'react';
import { SettingsIcon } from '../icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DirigirSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

// ---------------------------------------------------------------------------
// Inline icons — 18x18, stroke-based, geometric
// ---------------------------------------------------------------------------

function ProjectsIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="10.5" y="2" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="10.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function PagesIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13 16H5a1.5 1.5 0 01-1.5-1.5v-11A1.5 1.5 0 015 2h5.5L14.5 6v8.5A1.5 1.5 0 0113 16z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.5 2v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 10h4M7 12.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function RequestsIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10.5 2L6.5 10h5l-4 6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 5.5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeployIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 14V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M5 7.5L9 3.5l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------

const topNavItems = [
  { id: 'dashboard', label: 'Projects', icon: <ProjectsIcon /> },
  { id: 'pages', label: 'Pages', icon: <PagesIcon /> },
  { id: 'requests', label: 'Requests', icon: <RequestsIcon /> },
  { id: 'history', label: 'History', icon: <HistoryIcon /> },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DirigirSidebar = React.memo(function DirigirSidebar({
  currentPage,
  onNavigate,
}: DirigirSidebarProps) {
  return (
    <aside className="w-[52px] flex flex-col items-center py-4 bg-surface-0 border-r border-border-subtle">
      {/* Spacer for macOS traffic lights */}
      <div className="h-[38px] shrink-0 drag-region" />

      {/* Top navigation */}
      <nav className="flex flex-col items-center gap-1">
        {topNavItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-2 rounded-card cursor-pointer transition-colors ${
                isActive
                  ? 'bg-surface-2 text-text-primary'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-1'
              }`}
              aria-label={item.label}
              title={item.label}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="text-micro leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-3">
        {/* Deploy button */}
        <button
          onClick={() => onNavigate('deploy')}
          className="w-9 h-9 rounded-card bg-accent text-white flex items-center justify-center hover:bg-accent-hover transition-colors"
          aria-label="Deploy"
          title="Deploy"
        >
          <DeployIcon />
        </button>

        {/* Settings */}
        <button
          onClick={() => onNavigate('settings')}
          className={`flex flex-col items-center gap-0.5 py-2 px-2 rounded-card cursor-pointer transition-colors ${
            currentPage === 'settings'
              ? 'bg-surface-2 text-text-primary'
              : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-1'
          }`}
          aria-label="Settings"
          title="Settings"
        >
          <span className="shrink-0">
            <SettingsIcon size={18} />
          </span>
          <span className="text-micro leading-none">Settings</span>
        </button>
      </div>
    </aside>
  );
});

export default DirigirSidebar;
