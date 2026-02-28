import React from 'react';
import { SearchIcon } from '../icons';

interface TopBarProps {
  pageTitle: string;
  onOpenSearch?: () => void;
}

export default function TopBar({ pageTitle, onOpenSearch }: TopBarProps) {
  return (
    <header className="drag-region flex items-center justify-between h-[52px] px-6 border-b border-border-subtle bg-surface-1 shrink-0">
      <span className="text-sm font-medium text-text-secondary">{pageTitle}</span>

      <button
        onClick={onOpenSearch}
        aria-label="Search projects (Cmd+K)"
        className="no-drag flex items-center gap-2 px-3 py-1.5 rounded-button bg-surface-2 border border-border-subtle text-text-tertiary hover:text-text-secondary hover:border-border-default transition-colors text-xs"
      >
        <SearchIcon />
        <span>Search</span>
        <kbd className="ml-1 px-1.5 py-0.5 rounded bg-surface-3 border border-border-subtle text-micro font-mono">
          {'\u2318'}K
        </kbd>
      </button>
    </header>
  );
}
