import React from 'react';
import type { OrchestratorCell } from '../../../shared/types';
import { CloseIcon, TerminalIcon, FeedIcon, LayersIcon, EyeIcon } from '../icons';

interface CellHeaderProps {
  cell: OrchestratorCell;
  isActive: boolean;
  onClose: () => void;
  onFocus: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  terminal: <TerminalIcon size={12} />,
  feed: <FeedIcon size={12} />,
  taskboard: <LayersIcon size={12} />,
  preview: <EyeIcon size={12} />,
};

const typeLabels: Record<string, string> = {
  terminal: 'Terminal',
  feed: 'Feed',
  taskboard: 'Tasks',
  preview: 'Preview',
};

export default function CellHeader({ cell, isActive, onClose, onFocus }: CellHeaderProps) {
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 border-b shrink-0 cursor-pointer transition-colors ${
        isActive ? 'border-accent bg-surface-1' : 'border-border-subtle bg-surface-1'
      }`}
      onClick={onFocus}
    >
      <span className="text-text-tertiary shrink-0">{typeIcons[cell.config.type]}</span>
      <span className="text-xs font-medium text-text-primary truncate flex-1">
        {cell.config.label}
      </span>
      <span className="text-micro text-text-tertiary shrink-0">
        {typeLabels[cell.config.type]}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="p-0.5 rounded text-text-tertiary hover:text-status-dirty hover:bg-surface-3 transition-colors shrink-0"
        title="Close"
      >
        <CloseIcon size={10} />
      </button>
    </div>
  );
}
