# Project Organization by Client + Auto-Session

## Overview

Reorganize the Dashboard to group projects by client (parsed from CLAUDE.md) using collapsible accordion sections, sorted by recency. When opening a project, automatically launch the Orchestrator in split layout with a Claude Code terminal + Preview.

## Decisions

| Aspect | Decision |
|--------|----------|
| Client source | `client: Name` field in project's CLAUDE.md |
| Grouping | Accordion sections per client, sorted by most recent activity |
| Fallback | Projects without `client:` field go into "Uncategorized" (last group) |
| Auto-session | Clicking a project opens Orchestrator in split: Claude terminal + Preview |
| Mode choice | Quick dialog before opening: "Claude" vs "Claude Autopilot" |
| Preview behavior | Uses PreviewPanel with projectPath (auto-detects dev server or shows production) |

## Architecture

### 1. Client Field Parsing

Add `client: string | null` to the `Project` interface. In `buildProjectSummary()`, parse the already-loaded `claudeMd` string:

```typescript
function parseClient(claudeMd: string | null): string | null {
  if (!claudeMd) return null;
  const match = claudeMd.match(/^client:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}
```

### 2. Dashboard Accordion

Replace the current Active/Idle split with client-grouped accordion:

```
v THXType (3)
  [thxtype.com]  [molde.app]  [polymorph-site]

v Urbaniks (1)
  [urbaniks-site]

> Uncategorized (4)
```

- Clients sorted by most recent `lastActivity` across their projects
- Projects within each client sorted by `lastActivity` (newest first)
- Accordion open by default for clients with active projects
- Count badge next to client name
- Stats bar at top remains unchanged

### 3. Auto-Session on Project Open

When user clicks a project card in Dashboard:

1. Quick mode dialog appears: "Claude" or "Claude Autopilot"
2. Navigate to Orchestrator page
3. Orchestrator receives project config and auto-creates:
   - Terminal cell with `claude` or `claude --dangerously-skip-permissions` in project cwd
   - Preview cell with projectPath

### 4. Data Flow

```
Dashboard click → mode dialog → home.tsx navigates to 'sessions'
  → OrchestratorPage receives { projectPath, mode } via state/props
  → handleAddTerminal(command) + handleAddPreview() called on mount
```

## Modified Files

| File | Change |
|------|--------|
| `shared/types.ts` | Add `client: string \| null` to Project interface |
| `main/ipc/projects.ts` | Parse `client:` from claudeMd in buildProjectSummary |
| `renderer/components/dashboard/Dashboard.tsx` | Rewrite with accordion groups by client |
| `renderer/components/orchestrator/OrchestratorPage.tsx` | Accept initial project config, auto-create cells on mount |
| `renderer/pages/home.tsx` | Pass project + mode to Orchestrator when opening a project |

## No New Files

All changes fit within existing files.

## Future

- Client management UI (rename, merge, reorder clients)
- Persist accordion open/closed state
- Project pinning within client groups
- Default mode preference per project (always autopilot, always normal)
