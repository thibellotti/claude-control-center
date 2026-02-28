# Orchestrator — Claude Code Session Grid

## Overview

Replace the existing `SessionsCanvas` page with a full orchestrator — a flexible grid of interactive panels where each cell can be a terminal (xterm), activity feed, task board, or live preview. The user controls multiple Claude Code sessions and tools simultaneously from a single view.

## Decisions

| Aspect | Decision |
|--------|----------|
| Scope | Replaces SessionsCanvas; rest of app unchanged |
| Interaction | Full interactive xterm terminal per cell |
| Layout | Presets (1x1, 2x1, 2x2, 1+2) + manual resize via drag |
| Cell types | Terminal, Feed, Task Board, Preview — all in v1 |
| Broadcast | Deferred to v2 |
| Grid engine | `react-resizable-panels` (already in project) |

## Architecture

### Layout Engine

Nested `PanelGroup` components from `react-resizable-panels`:

```
PanelGroup (horizontal)
├── Panel (left column)
│   └── PanelGroup (vertical)
│       ├── Panel → <CellRenderer type="terminal" />
│       └── Panel → <CellRenderer type="feed" />
└── Panel (right column)
    └── PanelGroup (vertical)
        ├── Panel → <CellRenderer type="terminal" />
        └── Panel → <CellRenderer type="taskboard" />
```

Layout presets define the PanelGroup structure and default sizes:

| Preset | Structure | Use case |
|--------|-----------|----------|
| Focus | 1x1 | Single agent fullscreen |
| Split | 2x1 | Two terminals side by side |
| Quad | 2x2 | Four equal panels |
| Main+Side | 1 large + 2 small stacked | Primary agent + auxiliaries |

### Cell Types

#### 1. Terminal Cell
```typescript
interface TerminalCell {
  type: 'terminal'
  sessionId: string       // PTY session ID
  label: string           // e.g. "Claude: project-x" or "Shell"
  cwd: string             // Working directory
  command?: string        // e.g. "claude" or undefined (default shell)
}
```
- Full xterm with input
- Header: label + PID + close button
- Auto-fit on panel resize via FitAddon
- Spawns PTY via `ptyCreate({ cwd, command })`

#### 2. Feed Cell
```typescript
interface FeedCell {
  type: 'feed'
  projectPath: string     // Project path for JSONL monitoring
  label: string
}
```
- Reuses existing `TranslatedFeed` component
- Read-only translated Claude Code activity
- Pulsing dot activity indicator

#### 3. Task Board Cell
```typescript
interface TaskBoardCell {
  type: 'taskboard'
  teamName: string        // Team name from ~/.claude/teams/
  label: string
}
```
- Reuses existing `TaskList` component
- Shows tasks with status and owners
- Read-only in v1

#### 4. Preview Cell
```typescript
interface PreviewCell {
  type: 'preview'
  url: string             // Dev server URL (e.g. http://localhost:3000)
  label: string
}
```
- iframe pointing to dev server
- Toolbar with refresh, URL bar
- Reuses existing `PreviewPanel`

### State Management

Single `useOrchestrator()` hook:

```typescript
interface OrchestratorState {
  cells: OrchestratorCell[]
  layout: LayoutPreset
  activeCell: string | null
}

// Actions
addCell(type, config)        // Add cell to grid
removeCell(id)               // Remove cell and cleanup PTY if terminal
updateCell(id, patch)        // Update cell config
setLayout(preset)            // Change layout preset
focusCell(id)                // Set active cell
saveWorkspace()              // Persist to electron-store
loadWorkspace()              // Restore from electron-store
```

Delegates to existing hooks:
- Terminal cells → `useTerminal()`
- Feed cells → `useLiveFeed()`
- Task cells → IPC `getTeamTasks()`
- Preview cells → `usePreview()`

### Persistence

- Layout + cell configs saved via `electron-store`
- Restored on app launch
- Terminal PTYs re-created (PTY processes don't persist across app restarts)

## Integration

### Modified files
| File | Change |
|------|--------|
| `pages/home.tsx` | `case 'sessions'` → render `OrchestratorPage` (dynamic import) |
| `components/layout/Sidebar.tsx` | Rename "Sessions" → "Orchestrator" + new icon |
| `shared/types.ts` | Add `OrchestratorCell`, `LayoutPreset`, `OrchestratorWorkspace` types |

### New files
```
renderer/components/orchestrator/
├── OrchestratorPage.tsx      # Main container
├── OrchestratorToolbar.tsx   # Top bar (layout selector + add cell buttons)
├── OrchestratorGrid.tsx      # PanelGroup layout engine
├── CellRenderer.tsx          # Switch component for cell types
├── CellHeader.tsx            # Uniform header bar for all cells
├── cells/
│   ├── TerminalCell.tsx      # XTerminal wrapper
│   ├── FeedCell.tsx          # TranslatedFeed wrapper
│   ├── TaskBoardCell.tsx     # Task list view
│   └── PreviewCell.tsx       # PreviewPanel wrapper
└── AddCellModal.tsx          # Config modal when adding a cell

renderer/hooks/
└── useOrchestrator.ts        # Central state management
```

### Unchanged
- Dashboard, Dirigir, Terminal Page, Prompts, Settings
- `XTerminal.tsx` — reused without modification
- `TranslatedFeed` — reused without modification
- All existing hooks (`useTerminal`, `useLiveFeed`, `usePreview`)
- All IPC handlers and preload bridge

## Future (v2)
- Broadcast: global input field that sends to selected cells
- Workspace templates: save/load named workspace configurations
- Cell linking: connect terminal output to feed monitoring
- Drag-and-drop cell reordering
