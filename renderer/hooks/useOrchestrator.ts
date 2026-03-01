import { useState, useCallback, useMemo } from 'react';
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
const MAX_CELLS = 4;

function autoLayout(cellCount: number): LayoutPreset {
  if (cellCount <= 1) return 'focus';
  if (cellCount === 2) return 'split';
  if (cellCount === 3) return 'main-side';
  return 'quad';
}

function loadWorkspace(): OrchestratorWorkspace | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrchestratorWorkspace;
  } catch {
    return null;
  }
}

function saveWorkspace(cells: OrchestratorCell[]): void {
  try {
    const workspace: OrchestratorWorkspace = {
      layout: autoLayout(cells.length),
      cells: cells.map((cell) => {
        if (cell.config.type === 'terminal') {
          return { ...cell, config: { ...cell.config, sessionId: '' } };
        }
        return cell;
      }),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  } catch {
    // Ignore
  }
}

export function useOrchestrator() {
  const [cells, setCells] = useState<OrchestratorCell[]>([]);
  const [activeCell, setActiveCell] = useState<string | null>(null);

  // Layout is always derived from cell count — never out of sync
  const layout = useMemo(() => autoLayout(cells.length), [cells.length]);

  const addCell = useCallback(
    (config: OrchestratorCellConfig) => {
      const cell: OrchestratorCell = { id: generateCellId(), config };
      setCells((prev) => {
        if (prev.length >= MAX_CELLS) return prev;
        return [...prev, cell];
      });
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

  const clearCells = useCallback(() => {
    setCells([]);
    setActiveCell(null);
  }, []);

  const persistWorkspace = useCallback(() => {
    saveWorkspace(cells);
  }, [cells]);

  const restoreWorkspace = useCallback(() => {
    const ws = loadWorkspace();
    if (ws && ws.cells.length > 0) {
      setCells(ws.cells);
    }
  }, []);

  return {
    cells,
    layout,
    activeCell,
    addCell,
    removeCell,
    updateCell,
    clearCells,
    setActiveCell,
    persistWorkspace,
    restoreWorkspace,
  };
}
