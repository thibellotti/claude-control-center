import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { OrchestratorCell, LayoutPreset } from '../../../shared/types';
import CellRenderer from './CellRenderer';

interface OrchestratorGridProps {
  cells: OrchestratorCell[];
  layout: LayoutPreset;
  activeCell: string | null;
  onCloseCell: (id: string) => void;
  onFocusCell: (id: string) => void;
}

function ResizeHandle({ direction }: { direction: 'horizontal' | 'vertical' }) {
  return (
    <PanelResizeHandle
      className={`group relative flex items-center justify-center ${
        direction === 'horizontal' ? 'w-1 mx-0' : 'h-1 my-0'
      }`}
    >
      <div
        className={`rounded-full bg-border-subtle group-hover:bg-accent group-active:bg-accent transition-colors ${
          direction === 'horizontal' ? 'w-0.5 h-8' : 'h-0.5 w-8'
        }`}
      />
    </PanelResizeHandle>
  );
}

function CellPanel({
  cell,
  activeCell,
  onCloseCell,
  onFocusCell,
}: {
  cell: OrchestratorCell | undefined;
  activeCell: string | null;
  onCloseCell: (id: string) => void;
  onFocusCell: (id: string) => void;
}) {
  if (!cell) {
    return (
      <div className="flex items-center justify-center h-full bg-surface-0 rounded-card border border-dashed border-border-subtle">
        <p className="text-xs text-text-tertiary">Empty slot</p>
      </div>
    );
  }

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
  layout,
  activeCell,
  onCloseCell,
  onFocusCell,
}: OrchestratorGridProps) {
  const at = (i: number) => cells[i];

  if (cells.length === 0) {
    return null;
  }

  switch (layout) {
    case 'focus':
      return (
        <div className="h-full p-1.5">
          <CellPanel cell={at(0)} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
        </div>
      );

    case 'split':
      return (
        <PanelGroup direction="horizontal" className="h-full p-1.5 gap-0">
          <Panel defaultSize={50} minSize={20}>
            <div className="h-full pr-0.5">
              <CellPanel cell={at(0)} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
            </div>
          </Panel>
          <ResizeHandle direction="horizontal" />
          <Panel defaultSize={50} minSize={20}>
            <div className="h-full pl-0.5">
              <CellPanel cell={at(1)} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
            </div>
          </Panel>
        </PanelGroup>
      );

    case 'quad':
      return (
        <PanelGroup direction="horizontal" className="h-full p-1.5 gap-0">
          <Panel defaultSize={50} minSize={20}>
            <PanelGroup direction="vertical" className="h-full">
              <Panel defaultSize={50} minSize={20}>
                <div className="h-full pb-0.5 pr-0.5">
                  <CellPanel cell={at(0)} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
                </div>
              </Panel>
              <ResizeHandle direction="vertical" />
              <Panel defaultSize={50} minSize={20}>
                <div className="h-full pt-0.5 pr-0.5">
                  <CellPanel cell={at(1)} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
          <ResizeHandle direction="horizontal" />
          <Panel defaultSize={50} minSize={20}>
            <PanelGroup direction="vertical" className="h-full">
              <Panel defaultSize={50} minSize={20}>
                <div className="h-full pb-0.5 pl-0.5">
                  <CellPanel cell={at(2)} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
                </div>
              </Panel>
              <ResizeHandle direction="vertical" />
              <Panel defaultSize={50} minSize={20}>
                <div className="h-full pt-0.5 pl-0.5">
                  <CellPanel cell={at(3)} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      );

    case 'main-side':
      return (
        <PanelGroup direction="horizontal" className="h-full p-1.5 gap-0">
          <Panel defaultSize={65} minSize={30}>
            <div className="h-full pr-0.5">
              <CellPanel cell={at(0)} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
            </div>
          </Panel>
          <ResizeHandle direction="horizontal" />
          <Panel defaultSize={35} minSize={20}>
            <PanelGroup direction="vertical" className="h-full">
              <Panel defaultSize={50} minSize={20}>
                <div className="h-full pb-0.5 pl-0.5">
                  <CellPanel cell={at(1)} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
                </div>
              </Panel>
              <ResizeHandle direction="vertical" />
              <Panel defaultSize={50} minSize={20}>
                <div className="h-full pt-0.5 pl-0.5">
                  <CellPanel cell={at(2)} activeCell={activeCell} onCloseCell={onCloseCell} onFocusCell={onFocusCell} />
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      );

    default:
      return null;
  }
}
