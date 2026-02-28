# Orchestrator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace SessionsCanvas with a flexible grid orchestrator where each cell can be an interactive terminal, activity feed, task board, or live preview — all using `react-resizable-panels`.

**Architecture:** New `OrchestratorPage` replaces `SessionsCanvas` in the routing. A `useOrchestrator` hook manages cell state and layout presets. Each cell delegates rendering to existing components (`XTerminal`, `TranslatedFeed`, `TaskList`, `PreviewPanel`). Grid layout uses nested `PanelGroup` from `react-resizable-panels` (already installed).

**Tech Stack:** React 18, Next.js 14, TypeScript, react-resizable-panels, xterm.js, TailwindCSS, Electron IPC

---

### Task 1: Add Orchestrator Types to shared/types.ts

**Files:**
- Modify: `shared/types.ts:420` (before closing `IPC_CHANNELS`)

**Step 1: Add the orchestrator types at the end of the file (before IPC_CHANNELS)**

Add these types after line 345 (after `TranslatedFeedEntry` interface), before `IPC_CHANNELS`:

```typescript
// -- Orchestrator --

export type LayoutPreset = 'focus' | 'split' | 'quad' | 'main-side';

export type CellType = 'terminal' | 'feed' | 'taskboard' | 'preview';

export interface CellConfigTerminal {
  type: 'terminal';
  sessionId: string;
  label: string;
  cwd: string;
  command?: string;
}

export interface CellConfigFeed {
  type: 'feed';
  projectPath: string;
  label: string;
}

export interface CellConfigTaskBoard {
  type: 'taskboard';
  teamName: string;
  label: string;
}

export interface CellConfigPreview {
  type: 'preview';
  url: string;
  label: string;
  projectPath?: string;
}

export type OrchestratorCell = {
  id: string;
  config: CellConfigTerminal | CellConfigFeed | CellConfigTaskBoard | CellConfigPreview;
};

export interface OrchestratorWorkspace {
  cells: OrchestratorCell[];
  layout: LayoutPreset;
}
```

**Step 2: Commit**

```bash
git add shared/types.ts
git commit -m "feat(orchestrator): add orchestrator types to shared types"
```

---

### Task 2: Create useOrchestrator Hook

**Files:**
- Create: `renderer/hooks/useOrchestrator.ts`

**Step 1: Write the hook**

```typescript
import { useState, useCallback } from 'react';
import type {
  OrchestratorCell,
  LayoutPreset,
  OrchestratorWorkspace,
  CellConfigTerminal,
  CellConfigFeed,
  CellConfigTaskBoard,
  CellConfigPreview,
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
    // Don't persist terminal sessionIds — they won't be valid on reload
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
    (config: CellConfigTerminal | CellConfigFeed | CellConfigTaskBoard | CellConfigPreview) => {
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
    (id: string, patch: Partial<OrchestratorCell['config']>) => {
      setCells((prev) =>
        prev.map((c) => (c.id === id ? { ...c, config: { ...c.config, ...patch } as typeof c.config } : c))
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
```

**Step 2: Commit**

```bash
git add renderer/hooks/useOrchestrator.ts
git commit -m "feat(orchestrator): add useOrchestrator hook for cell and layout state"
```

---

### Task 3: Create CellHeader Component

**Files:**
- Create: `renderer/components/orchestrator/CellHeader.tsx`

**Step 1: Write the component**

```typescript
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
```

**Step 2: Commit**

```bash
git add renderer/components/orchestrator/CellHeader.tsx
git commit -m "feat(orchestrator): add CellHeader component"
```

---

### Task 4: Create Cell Components (Terminal, Feed, TaskBoard, Preview)

**Files:**
- Create: `renderer/components/orchestrator/cells/TerminalCell.tsx`
- Create: `renderer/components/orchestrator/cells/FeedCell.tsx`
- Create: `renderer/components/orchestrator/cells/TaskBoardCell.tsx`
- Create: `renderer/components/orchestrator/cells/PreviewCell.tsx`

**Step 1: Write TerminalCell**

```typescript
import React from 'react';
import dynamic from 'next/dynamic';
import type { CellConfigTerminal } from '../../../../shared/types';

const XTerminal = dynamic(() => import('../../terminal/XTerminal'), { ssr: false });

interface TerminalCellProps {
  config: CellConfigTerminal;
}

export default function TerminalCell({ config }: TerminalCellProps) {
  if (!config.sessionId) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0A0A0A]">
        <p className="text-xs text-text-tertiary">Connecting...</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0A0A0A]">
      <XTerminal sessionId={config.sessionId} isVisible={true} />
    </div>
  );
}
```

**Step 2: Write FeedCell**

```typescript
import React, { useEffect, useMemo } from 'react';
import type { CellConfigFeed } from '../../../../shared/types';
import { useLiveFeed } from '../../../hooks/useTerminal';

interface FeedCellProps {
  config: CellConfigFeed;
}

export default function FeedCell({ config }: FeedCellProps) {
  const liveFeed = useLiveFeed();

  useEffect(() => {
    liveFeed.start();
    return () => liveFeed.stop();
  }, []);

  const filtered = useMemo(
    () => liveFeed.entries.filter((e) => e.projectPath === config.projectPath),
    [liveFeed.entries, config.projectPath]
  );

  const scrollRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered.length]);

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-text-tertiary">Waiting for activity...</p>
          </div>
        ) : (
          filtered.map((entry, i) => (
            <div
              key={`${entry.timestamp}-${i}`}
              className="flex items-start gap-1.5 px-2.5 py-1 border-b border-border-subtle/20"
            >
              <span className="text-micro font-mono text-text-tertiary shrink-0 mt-px w-[50px]">
                {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <p className="text-micro text-text-secondary leading-snug break-words min-w-0">
                {entry.summary}
              </p>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between px-2.5 py-1 border-t border-border-subtle bg-surface-0 shrink-0">
        <span className="text-micro text-text-tertiary">{filtered.length} events</span>
        {filtered.length > 0 && (
          <span className="text-micro text-status-active font-medium">Live</span>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Write TaskBoardCell**

```typescript
import React, { useState, useEffect } from 'react';
import type { CellConfigTaskBoard, TaskItem, Team } from '../../../../shared/types';
import TaskList from '../../project/TaskList';

interface TaskBoardCellProps {
  config: CellConfigTaskBoard;
}

export default function TaskBoardCell({ config }: TaskBoardCellProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Read team config to find tasks directory
        const teamConfigPath = `~/.claude/teams/${config.teamName}/config.json`;
        const teamRaw = await window.api.readFile(teamConfigPath);
        if (cancelled) return;

        if (teamRaw) {
          const teamData = JSON.parse(teamRaw) as Team;
          setTeam(teamData);
        }

        // Read tasks from ~/.claude/tasks/{teamName}/
        const tasksDir = `~/.claude/tasks/${config.teamName}`;
        // We'll load via project detail which already handles task parsing
        // For now, show empty state if no tasks found
      } catch {
        // Team may not exist yet
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    // Poll every 5s for updates
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [config.teamName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-text-tertiary">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-3">
      {team && (
        <div className="flex items-center gap-2 py-2 border-b border-border-subtle mb-2">
          <span className="text-xs font-medium text-text-primary">{team.name}</span>
          <span className="text-micro text-text-tertiary">
            {team.members.length} members
          </span>
        </div>
      )}
      <TaskList tasks={tasks} />
    </div>
  );
}
```

**Step 4: Write PreviewCell**

```typescript
import React from 'react';
import type { CellConfigPreview } from '../../../../shared/types';
import PreviewPanel from '../../preview/PreviewPanel';

interface PreviewCellProps {
  config: CellConfigPreview;
}

export default function PreviewCell({ config }: PreviewCellProps) {
  if (config.projectPath) {
    return <PreviewPanel projectPath={config.projectPath} />;
  }

  // Simple iframe for URL-only previews
  return (
    <div className="h-full">
      <iframe
        src={config.url}
        className="w-full h-full border-0"
        title={config.label}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add renderer/components/orchestrator/cells/
git commit -m "feat(orchestrator): add Terminal, Feed, TaskBoard, and Preview cell components"
```

---

### Task 5: Create CellRenderer Switch Component

**Files:**
- Create: `renderer/components/orchestrator/CellRenderer.tsx`

**Step 1: Write the component**

```typescript
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
```

**Step 2: Commit**

```bash
git add renderer/components/orchestrator/CellRenderer.tsx
git commit -m "feat(orchestrator): add CellRenderer switch component"
```

---

### Task 6: Create OrchestratorGrid Layout Engine

**Files:**
- Create: `renderer/components/orchestrator/OrchestratorGrid.tsx`

**Step 1: Write the grid component**

This uses `react-resizable-panels` to create nested panel groups based on layout preset.

```typescript
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
  // Helper to get cell at index (or undefined for empty slots)
  const at = (i: number) => cells[i];

  if (cells.length === 0) {
    return null; // Empty state handled by parent
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
```

**Step 2: Commit**

```bash
git add renderer/components/orchestrator/OrchestratorGrid.tsx
git commit -m "feat(orchestrator): add OrchestratorGrid layout engine with presets"
```

---

### Task 7: Create OrchestratorToolbar

**Files:**
- Create: `renderer/components/orchestrator/OrchestratorToolbar.tsx`

**Step 1: Write the toolbar**

```typescript
import React, { useState } from 'react';
import type { LayoutPreset } from '../../../shared/types';
import { PlusIcon, TerminalIcon, FeedIcon, LayersIcon, EyeIcon, ClaudeIcon } from '../icons';

interface OrchestratorToolbarProps {
  layout: LayoutPreset;
  cellCount: number;
  onSetLayout: (preset: LayoutPreset) => void;
  onAddTerminal: (command?: string) => void;
  onAddFeed: () => void;
  onAddTaskBoard: () => void;
  onAddPreview: () => void;
}

const layoutOptions: { id: LayoutPreset; label: string; icon: string }[] = [
  { id: 'focus', label: 'Focus', icon: '[ ]' },
  { id: 'split', label: 'Split', icon: '[ | ]' },
  { id: 'quad', label: 'Quad', icon: '[+]' },
  { id: 'main-side', label: 'Main+Side', icon: '[|:]' },
];

export default function OrchestratorToolbar({
  layout,
  cellCount,
  onSetLayout,
  onAddTerminal,
  onAddFeed,
  onAddTaskBoard,
  onAddPreview,
}: OrchestratorToolbarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface-0 shrink-0">
      {/* Left: Layout selector */}
      <div className="flex items-center gap-1">
        {layoutOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSetLayout(opt.id)}
            className={`px-2.5 py-1 rounded-button text-xs font-mono transition-colors ${
              layout === opt.id
                ? 'bg-surface-3 text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2'
            }`}
            title={opt.label}
          >
            {opt.icon}
          </button>
        ))}
      </div>

      {/* Center: Info */}
      <span className="text-micro text-text-tertiary">
        {cellCount} {cellCount === 1 ? 'cell' : 'cells'}
      </span>

      {/* Right: Add button */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          <PlusIcon size={12} />
          Add
        </button>

        {showAddMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 bg-surface-2 border border-border-subtle rounded-card shadow-xl py-1 min-w-[200px]">
              <button
                onClick={() => { onAddTerminal(); setShowAddMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <TerminalIcon size={14} />
                Shell Terminal
              </button>
              <button
                onClick={() => { onAddTerminal('claude'); setShowAddMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <ClaudeIcon size={14} />
                Claude Session
              </button>
              <div className="border-t border-border-subtle my-1" />
              <button
                onClick={() => { onAddFeed(); setShowAddMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <FeedIcon size={14} />
                Activity Feed
              </button>
              <button
                onClick={() => { onAddTaskBoard(); setShowAddMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <LayersIcon size={14} />
                Task Board
              </button>
              <button
                onClick={() => { onAddPreview(); setShowAddMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <EyeIcon size={14} />
                Preview
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add renderer/components/orchestrator/OrchestratorToolbar.tsx
git commit -m "feat(orchestrator): add OrchestratorToolbar with layout presets and add menu"
```

---

### Task 8: Create OrchestratorPage (Main Container)

**Files:**
- Create: `renderer/components/orchestrator/OrchestratorPage.tsx`

**Step 1: Write the main page component**

```typescript
import React, { useCallback, useEffect } from 'react';
import { useOrchestrator } from '../../hooks/useOrchestrator';
import { useTerminalSessions } from '../../hooks/useTerminal';
import OrchestratorToolbar from './OrchestratorToolbar';
import OrchestratorGrid from './OrchestratorGrid';
import type { CellConfigTerminal } from '../../../shared/types';
import { TerminalIcon, ClaudeIcon } from '../icons';

export default function OrchestratorPage() {
  const orchestrator = useOrchestrator();
  const { createSession, killSession } = useTerminalSessions();

  // Restore workspace on mount
  useEffect(() => {
    orchestrator.restoreWorkspace();
  }, []);

  // Persist workspace when cells or layout change
  useEffect(() => {
    orchestrator.persistWorkspace();
  }, [orchestrator.cells, orchestrator.layout]);

  const handleAddTerminal = useCallback(
    async (command?: string) => {
      const result = await createSession(undefined, command);
      const isClaude = command === 'claude';
      orchestrator.addCell({
        type: 'terminal',
        sessionId: result,
        label: isClaude ? 'Claude' : 'Shell',
        cwd: process.env.HOME || '~',
        command,
      });
    },
    [createSession, orchestrator.addCell]
  );

  const handleAddFeed = useCallback(() => {
    orchestrator.addCell({
      type: 'feed',
      projectPath: process.env.HOME || '~',
      label: 'Activity Feed',
    });
  }, [orchestrator.addCell]);

  const handleAddTaskBoard = useCallback(() => {
    orchestrator.addCell({
      type: 'taskboard',
      teamName: '',
      label: 'Task Board',
    });
  }, [orchestrator.addCell]);

  const handleAddPreview = useCallback(() => {
    orchestrator.addCell({
      type: 'preview',
      url: 'http://localhost:3000',
      label: 'Preview',
    });
  }, [orchestrator.addCell]);

  const handleCloseCell = useCallback(
    async (id: string) => {
      const cell = orchestrator.cells.find((c) => c.id === id);
      if (cell?.config.type === 'terminal' && cell.config.sessionId) {
        await killSession(cell.config.sessionId);
      }
      orchestrator.removeCell(id);
    },
    [orchestrator.cells, orchestrator.removeCell, killSession]
  );

  const isEmpty = orchestrator.cells.length === 0;

  return (
    <div className="flex flex-col h-full">
      <OrchestratorToolbar
        layout={orchestrator.layout}
        cellCount={orchestrator.cells.length}
        onSetLayout={orchestrator.setLayout}
        onAddTerminal={handleAddTerminal}
        onAddFeed={handleAddFeed}
        onAddTaskBoard={handleAddTaskBoard}
        onAddPreview={handleAddPreview}
      />

      {isEmpty ? (
        <div className="flex items-center justify-center flex-1">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-14 h-14 rounded-xl bg-surface-2 flex items-center justify-center mx-auto">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-text-tertiary">
                <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <rect x="16" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <rect x="2" y="16" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <rect x="16" y="16" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Orchestrator</p>
              <p className="text-xs text-text-tertiary mt-1">
                Create terminals, feeds, and previews in a flexible grid.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleAddTerminal()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-button text-xs font-medium bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
              >
                <TerminalIcon size={14} />
                Shell
              </button>
              <button
                onClick={() => handleAddTerminal('claude')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
              >
                <ClaudeIcon size={14} />
                Claude Session
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <OrchestratorGrid
            cells={orchestrator.cells}
            layout={orchestrator.layout}
            activeCell={orchestrator.activeCell}
            onCloseCell={handleCloseCell}
            onFocusCell={orchestrator.setActiveCell}
          />
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add renderer/components/orchestrator/OrchestratorPage.tsx
git commit -m "feat(orchestrator): add OrchestratorPage main container"
```

---

### Task 9: Wire Orchestrator into App Routing

**Files:**
- Modify: `renderer/pages/home.tsx:15` (change SessionsCanvas import)
- Modify: `renderer/pages/home.tsx:93-94` (update page title)
- Modify: `renderer/pages/home.tsx:143` (swap component)
- Modify: `renderer/components/layout/Sidebar.tsx:19` (rename nav item)

**Step 1: Update home.tsx**

In `renderer/pages/home.tsx`:

1. Change line 15 from:
```typescript
const SessionsCanvas = dynamic(() => import('../components/sessions/SessionsCanvas'), { ssr: false });
```
to:
```typescript
const OrchestratorPage = dynamic(() => import('../components/orchestrator/OrchestratorPage'), { ssr: false });
```

2. Change line 93-94 from:
```typescript
      : currentPage === 'sessions'
      ? 'Sessions'
```
to:
```typescript
      : currentPage === 'sessions'
      ? 'Orchestrator'
```

3. Change line 143 from:
```typescript
        {currentPage === 'sessions' && <SessionsCanvas />}
```
to:
```typescript
        {currentPage === 'sessions' && <OrchestratorPage />}
```

**Step 2: Update Sidebar.tsx**

In `renderer/components/layout/Sidebar.tsx`, change line 19 from:
```typescript
    { id: 'sessions', label: 'Sessions', icon: <ClaudeIcon size={16} /> },
```
to:
```typescript
    { id: 'sessions', label: 'Orchestrator', icon: <ClaudeIcon size={16} /> },
```

**Step 3: Commit**

```bash
git add renderer/pages/home.tsx renderer/components/layout/Sidebar.tsx
git commit -m "feat(orchestrator): wire OrchestratorPage into app routing, replacing SessionsCanvas"
```

---

### Task 10: Test and Verify

**Step 1: Run the dev server**

```bash
cd /Users/thiagobellotti/Projects/claude-control-center && npm run dev
```

Expected: Nextron dev server starts, Electron window opens.

**Step 2: Navigate to Orchestrator**

Click "Orchestrator" in the sidebar (was "Sessions").
Expected: Empty state with grid icon and "Shell" / "Claude Session" buttons.

**Step 3: Test adding a terminal cell**

Click "Shell" button.
Expected: A shell terminal appears in the grid with xterm rendering.

**Step 4: Test adding a Claude session**

Click the "Add" button in toolbar → "Claude Session".
Expected: A second cell appears with Claude CLI starting.

**Step 5: Test layout switching**

Click the layout preset buttons in the toolbar (`[ ]`, `[ | ]`, `[+]`, `[|:]`).
Expected: Grid reconfigures to match each layout preset.

**Step 6: Test resize**

Drag the handle between two panels.
Expected: Panels resize smoothly, xterm refits to new dimensions.

**Step 7: Test closing a cell**

Click the X button on a cell header.
Expected: Cell is removed, PTY is killed if terminal.

**Step 8: Final commit**

```bash
git add -A
git commit -m "feat(orchestrator): complete orchestrator v1 — grid, cells, layout presets"
```
