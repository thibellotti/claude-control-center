import React from 'react';

interface TopBarProps {
  pageTitle: string;
  onOpenSearch?: () => void;
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function TopBar({ pageTitle, onOpenSearch }: TopBarProps) {
  return (
    <header className="drag-region flex items-center justify-between h-[52px] px-6 border-b border-border-subtle bg-surface-1 shrink-0">
      <span className="text-sm font-medium text-text-secondary">{pageTitle}</span>

      <button
        onClick={onOpenSearch}
        className="no-drag flex items-center gap-2 px-3 py-1.5 rounded-button bg-surface-2 border border-border-subtle text-text-tertiary hover:text-text-secondary hover:border-border-default transition-colors text-xs"
      >
        <SearchIcon />
        <span>Search</span>
        <kbd className="ml-1 px-1.5 py-0.5 rounded bg-surface-3 border border-border-subtle text-[10px] font-mono">
          {'\u2318'}K
        </kbd>
      </button>
    </header>
  );
}
