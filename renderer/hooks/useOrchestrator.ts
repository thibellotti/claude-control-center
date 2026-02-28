import { useState, useCallback } from 'react';
import type {
  OrchestratorCell,
  LayoutPreset,
  OrchestratorWorkspace,
  OrchestratorCellConfig,
} from '../../shared/types';

let cellCounter = 0;
function generateCellId(): string {
  cellCounter += 1;
  return `cell-${Date.now()}-${cellCounter}`;
}

const STORAGE_KEY = 'orchestrator-workspace';

function loadWorkspace(): OrchestratorWorkspace | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrchestratorWorkspace;
  } catch {
    return null;
  }
}

function saveWorkspace(workspace: OrchestratorWorkspace): void {
  try {
    const cleaned: OrchestratorWorkspace = {
      ...workspace,
      cells: workspace.cells.map((cell) => {
        if (cell.config.type === 'terminal') {
          return { ...cell, config: { ...cell.config, sessionId: '' } };
        }
        return cell;
      }),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // Ignore
  }
}

export function useOrchestrator() {
  const [cells, setCells] = useState<OrchestratorCell[]>([]);
  const [layout, setLayout] = useState<LayoutPreset>('quad');
  const [activeCell, setActiveCell] = useState<string | null>(null);

  const addCell = useCallback(
    (config: OrchestratorCellConfig) => {
      const cell: OrchestratorCell = { id: generateCellId(), config };
      setCells((prev) => [...prev, cell]);
      setActiveCell(cell.id);
      return cell.id;
    },
    []
  );

  const removeCell = useCallback((id: string) => {
    setCells((prev) => prev.filter((c) => c.id !== id));
    setActiveCell((prev) => (prev === id ? null : prev));
  }, []);

  const updateCell = useCallback(
    (id: string, patch: Partial<OrchestratorCellConfig>) => {
      setCells((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, config: { ...c.config, ...patch } as OrchestratorCellConfig } : c
        )
      );
    },
    []
  );

  const persistWorkspace = useCallback(() => {
    saveWorkspace({ cells, layout });
  }, [cells, layout]);

  const restoreWorkspace = useCallback(() => {
    const ws = loadWorkspace();
    if (ws) {
      setCells(ws.cells);
      setLayout(ws.layout);
    }
  }, []);

  return {
    cells,
    layout,
    activeCell,
    addCell,
    removeCell,
    updateCell,
    setLayout,
    setActiveCell,
    persistWorkspace,
    restoreWorkspace,
  };
}
