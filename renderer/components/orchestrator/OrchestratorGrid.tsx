import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { OrchestratorCell } from '../../../shared/types';
import CellRenderer from './CellRenderer';

interface OrchestratorGridProps {
  cells: OrchestratorCell[];
  activeCell: string | null;
  onCloseCell: (id: string) => void;
  onFocusCell: (id: string) => void;
}

function ResizeHandle({ orientation }: { orientation: 'horizontal' | 'vertical' }) {
  return (
    <Separator
      className={`group relative flex items-center justify-center ${
        orientation === 'horizontal' ? 'w-1 mx-0' : 'h-1 my-0'
      }`}
    >
      <div
        className={`rounded-full bg-border-subtle group-hover:bg-accent group-active:bg-accent transition-colors ${
          orientation === 'horizontal' ? 'w-0.5 h-8' : 'h-0.5 w-8'
        }`}
      />
    </Separator>
  );
}

function CellPanel({
  cell,
  activeCell,
  onCloseCell,
  onFocusCell,
}: {
  cell: OrchestratorCell;
  activeCell: string | null;
  onCloseCell: (id: string) => void;
  onFocusCell: (id: string) => void;
}) {
  return (
    <CellRenderer
      cell={cell}
      isActive={activeCell === cell.id}
      onClose={() => onCloseCell(cell.id)}
      onFocus={() => onFocusCell(cell.id)}
    />
  );
}

export default function OrchestratorGrid({
  cells,
  activeCell,
  onCloseCell,
  onFocusCell,
}: OrchestratorGridProps) {
  if (cells.length === 0) {
    return null;
  }

  const layout = cells.length <= 1 ? 'focus'
    : cells.length === 2 ? 'split'
    : cells.length === 3 ? 'main-side'
    : 'quad';

  switch (layout) {
    case 'focus':
      return (
        <div className="h-full p-1.5">
          <CellPanel cell={cells[0]} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
        </div>
      );

    case 'split':
      return (
        <Group orientation="horizontal" className="h-full p-1.5">
          <Panel defaultSize={50} minSize={20}>
            <div className="h-full pr-0.5">
              <CellPanel cell={cells[0]} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
            </div>
          </Panel>
          <ResizeHandle orientation="horizontal" />
          <Panel defaultSize={50} minSize={20}>
            <div className="h-full pl-0.5">
              <CellPanel cell={cells[1]} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
            </div>
          </Panel>
        </Group>
      );

    case 'main-side':
      return (
        <Group orientation="horizontal" className="h-full p-1.5">
          <Panel defaultSize={65} minSize={30}>
            <div className="h-full pr-0.5">
              <CellPanel cell={cells[0]} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
            </div>
          </Panel>
          <ResizeHandle orientation="horizontal" />
          <Panel defaultSize={35} minSize={20}>
            <Group orientation="vertical" className="h-full">
              <Panel defaultSize={50} minSize={20}>
                <div className="h-full pb-0.5 pl-0.5">
                  <CellPanel cell={cells[1]} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
                </div>
              </Panel>
              <ResizeHandle orientation="vertical" />
              <Panel defaultSize={50} minSize={20}>
                <div className="h-full pt-0.5 pl-0.5">
                  <CellPanel cell={cells[2]} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
                </div>
              </Panel>
            </Group>
          </Panel>
        </Group>
      );

    case 'quad':
      return (
        <Group orientation="horizontal" className="h-full p-1.5">
          <Panel defaultSize={50} minSize={20}>
            <Group orientation="vertical" className="h-full">
              <Panel defaultSize={50} minSize={20}>
                <div className="h-full pb-0.5 pr-0.5">
                  <CellPanel cell={cells[0]} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
                </div>
              </Panel>
              <ResizeHandle orientation="vertical" />
              <Panel defaultSize={50} minSize={20}>
                <div className="h-full pt-0.5 pr-0.5">
                  <CellPanel cell={cells[1]} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
                </div>
              </Panel>
            </Group>
          </Panel>
          <ResizeHandle orientation="horizontal" />
          <Panel defaultSize={50} minSize={20}>
            <Group orientation="vertical" className="h-full">
              <Panel defaultSize={50} minSize={20}>
                <div className="h-full pb-0.5 pl-0.5">
                  <CellPanel cell={cells[2]} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
                </div>
              </Panel>
              <ResizeHandle orientation="vertical" />
              <Panel defaultSize={50} minSize={20}>
                <div className="h-full pt-0.5 pl-0.5">
                  <CellPanel cell={cells[3]} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
                </div>
              </Panel>
            </Group>
          </Panel>
        </Group>
      );

    default:
      return null;
  }
}
