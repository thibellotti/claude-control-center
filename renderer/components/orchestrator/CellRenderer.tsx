import React from 'react';
import dynamic from 'next/dynamic';
import type { OrchestratorCell } from '../../../shared/types';
import CellHeader from './CellHeader';

const TerminalCell = dynamic(() => import('./cells/TerminalCell'), { ssr: false });
const FeedCell = dynamic(() => import('./cells/FeedCell'), { ssr: false });
const TaskBoardCell = dynamic(() => import('./cells/TaskBoardCell'), { ssr: false });
const PreviewCell = dynamic(() => import('./cells/PreviewCell'), { ssr: false });

interface CellRendererProps {
  cell: OrchestratorCell;
  isActive: boolean;
  onClose: () => void;
  onFocus: () => void;
}

export default function CellRenderer({ cell, isActive, onClose, onFocus }: CellRendererProps) {
  function renderContent() {
    switch (cell.config.type) {
      case 'terminal':
        return <TerminalCell config={cell.config} />;
      case 'feed':
        return <FeedCell config={cell.config} />;
      case 'taskboard':
        return <TaskBoardCell config={cell.config} />;
      case 'preview':
        return <PreviewCell config={cell.config} />;
    }
  }

  return (
    <div
      className={`flex flex-col h-full overflow-hidden rounded-card border transition-colors ${
        isActive ? 'border-accent' : 'border-border-subtle'
      }`}
    >
      <CellHeader cell={cell} isActive={isActive} onClose={onClose} onFocus={onFocus} />
      <div className="flex-1 min-h-0">{renderContent()}</div>
    </div>
  );
}
