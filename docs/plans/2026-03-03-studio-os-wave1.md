# Forma Studio OS — Wave 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Forma from a Claude Code dashboard into a Studio OS — organized around client workspaces, with custom AI agents, per-client analytics, and a CLAUDE.md manager.

**Architecture:** Electron + Next.js renderer. All persistence is file-based (JSON in `~/.forma/`). Agents are spawned as isolated Claude Code child processes via node-pty. Analytics are parsed from existing JSONL session files in `~/.claude/projects/`. No external dependencies added (no SQLite, no Supabase yet — that's Wave 2).

**Tech Stack:** Electron 34, Next.js 14, React 18, TailwindCSS 3, node-pty, TypeScript 5.7

**No test infrastructure exists.** Steps reference manual verification via `tsc --noEmit` and app testing. TDD deferred to Wave 2 when vitest is added.

---

## Task 1: Client Workspaces — Data Layer

**Files:**
- Create: `shared/client-types.ts`
- Create: `main/ipc/clients.ts`
- Modify: `main/background.ts` (register new IPC handlers)
- Modify: `main/preload.ts` (expose new APIs)
- Modify: `shared/types.ts` (add IPC channels)
- Modify: `renderer/types/electron.d.ts` (window.api types)

**Step 1: Define client workspace types**

Create `shared/client-types.ts`:

```typescript
export interface BrandAssets {
  logo?: string;           // file path to logo
  colors?: string[];       // hex values e.g. ["#1a1a1a", "#ff5500"]
  typography?: string;     // font family description
  guidelines?: string;     // free-form brand rules text
}

export interface ClientBudget {
  totalAllocated?: number; // total budget in user's currency
  currency?: string;       // e.g. "BRL", "USD"
}

export interface ClientWorkspace {
  id: string;
  name: string;
  brandAssets?: BrandAssets;
  notes?: string;          // briefing, constraints, preferences
  budget?: ClientBudget;
  createdAt: number;
  updatedAt: number;
}
```

**Step 2: Add IPC channels to shared/types.ts**

Add to `IPC_CHANNELS`:
```typescript
GET_CLIENTS: 'get-clients',
SAVE_CLIENT: 'save-client',
DELETE_CLIENT: 'delete-client',
```

**Step 3: Create main/ipc/clients.ts**

```typescript
import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { IPC_CHANNELS } from '../../shared/types';
import type { ClientWorkspace } from '../../shared/client-types';
import { log } from '../helpers/logger';

const FORMA_DIR = join(homedir(), '.forma');
const CLIENTS_FILE = join(FORMA_DIR, 'clients.json');

async function ensureDir() {
  await fs.mkdir(FORMA_DIR, { recursive: true });
}

async function loadClients(): Promise<ClientWorkspace[]> {
  await ensureDir();
  try {
    const data = await fs.readFile(CLIENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveClients(clients: ClientWorkspace[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(CLIENTS_FILE, JSON.stringify(clients, null, 2), 'utf-8');
}

export function registerClientHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_CLIENTS, async () => {
    return loadClients();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_CLIENT, async (_, client: ClientWorkspace) => {
    const clients = await loadClients();
    const idx = clients.findIndex(c => c.id === client.id);
    if (idx >= 0) {
      clients[idx] = { ...client, updatedAt: Date.now() };
    } else {
      clients.push({
        ...client,
        id: client.id || uuidv4(),
        createdAt: client.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
    }
    await saveClients(clients);
    return clients;
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_CLIENT, async (_, clientId: string) => {
    const clients = await loadClients();
    const filtered = clients.filter(c => c.id !== clientId);
    await saveClients(filtered);
    return filtered;
  });
}
```

**Step 4: Register handlers in main/background.ts**

Add import and call `registerClientHandlers()` alongside existing handler registrations.

**Step 5: Expose in main/preload.ts**

Add to the contextBridge.exposeInMainWorld:
```typescript
getClients: () => ipcRenderer.invoke('get-clients'),
saveClient: (client) => ipcRenderer.invoke('save-client', client),
deleteClient: (clientId) => ipcRenderer.invoke('delete-client', clientId),
```

**Step 6: Update renderer/types/electron.d.ts**

Add the new methods to the `ElectronAPI` interface.

**Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: zero errors

**Step 8: Commit**

```bash
git add shared/client-types.ts main/ipc/clients.ts main/background.ts main/preload.ts shared/types.ts renderer/types/electron.d.ts
git commit -m "feat: add client workspace data layer (IPC + file persistence)"
```

---

## Task 2: Client Workspaces — React Hook

**Files:**
- Create: `renderer/hooks/useClients.ts`

**Step 1: Create the hook**

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { ClientWorkspace } from '../../shared/client-types';

export function useClients() {
  const [clients, setClients] = useState<ClientWorkspace[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await window.api.getClients();
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveClient = useCallback(async (client: ClientWorkspace) => {
    const updated = await window.api.saveClient(client);
    setClients(updated);
    return updated;
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    const updated = await window.api.deleteClient(clientId);
    setClients(updated);
    return updated;
  }, []);

  return { clients, loading, saveClient, deleteClient, refresh };
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add renderer/hooks/useClients.ts
git commit -m "feat: add useClients hook for client workspace state"
```

---

## Task 3: Client Workspaces — Auto-Seed from Existing Projects

**Files:**
- Modify: `main/ipc/clients.ts`

**Step 1: Add auto-seed function**

When `loadClients()` returns empty but projects have `client` field values, auto-create client workspaces:

```typescript
import { ipcMain } from 'electron';
// ... existing imports

export function registerClientHandlers() {
  // Add a one-time seeding handler
  ipcMain.handle('seed-clients-from-projects', async (_, projects: { client?: string | null }[]) => {
    const existing = await loadClients();
    if (existing.length > 0) return existing; // already seeded

    const clientNames = new Set<string>();
    for (const p of projects) {
      if (p.client) clientNames.add(p.client);
    }

    const seeded: ClientWorkspace[] = [];
    for (const name of clientNames) {
      seeded.push({
        id: uuidv4(),
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    if (seeded.length > 0) {
      await saveClients(seeded);
    }
    return seeded;
  });

  // ... existing handlers
}
```

**Step 2: Update preload.ts**

Add: `seedClientsFromProjects: (projects) => ipcRenderer.invoke('seed-clients-from-projects', projects)`

**Step 3: Call from home.tsx**

After projects load, call seed once:
```typescript
useEffect(() => {
  if (projects.length > 0) {
    window.api.seedClientsFromProjects(projects.map(p => ({ client: p.client })));
  }
}, [projects]);
```

**Step 4: Verify and commit**

```bash
npx tsc --noEmit
git add main/ipc/clients.ts main/preload.ts renderer/pages/home.tsx renderer/types/electron.d.ts
git commit -m "feat: auto-seed client workspaces from existing project.client values"
```

---

## Task 4: Dashboard — Client Workspace View

**Files:**
- Create: `renderer/components/dashboard/ClientWorkspaceCard.tsx`
- Modify: `renderer/components/dashboard/Dashboard.tsx`
- Modify: `renderer/hooks/useProjectContext.tsx` (add clients to context)

**Step 1: Create ClientWorkspaceCard**

A card for each client workspace showing: name, project count, active sessions, total AI cost placeholder.

```typescript
// renderer/components/dashboard/ClientWorkspaceCard.tsx
import React, { memo } from 'react';
import type { ClientWorkspace } from '../../../shared/client-types';
import type { Project } from '../../../shared/types';

interface ClientWorkspaceCardProps {
  workspace: ClientWorkspace;
  projects: Project[];
  activeSessions: number;
  onClick: () => void;
}

export default memo(function ClientWorkspaceCard({
  workspace,
  projects,
  activeSessions,
  onClick,
}: ClientWorkspaceCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group bg-surface-1 border border-border-subtle rounded-card p-5 cursor-pointer hover:border-border-default transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
          {workspace.name}
        </h3>
        {activeSessions > 0 && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-status-active" />
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-text-tertiary">
        <span>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
        {activeSessions > 0 && (
          <span className="text-status-active">{activeSessions} live</span>
        )}
        {workspace.budget?.totalAllocated && (
          <span>Budget: {workspace.budget.currency || '$'}{workspace.budget.totalAllocated.toLocaleString()}</span>
        )}
      </div>

      {workspace.notes && (
        <p className="mt-2 text-xs text-text-secondary line-clamp-2">
          {workspace.notes}
        </p>
      )}
    </div>
  );
});
```

**Step 2: Modify Dashboard.tsx**

Add a new "Clients" section above the project accordions. Import `useClients`, render `ClientWorkspaceCard` for each. Clicking a card filters the project list to that client OR navigates to a client detail page.

For now, clicking a client card filters the existing accordion to show only that client's projects (simple filter, not a new page).

**Step 3: Add clients to ProjectContext**

Add `clients: ClientWorkspace[]` to the context so child components can access it.

**Step 4: Verify**

Run: `npx tsc --noEmit` and test in app — dashboard should show client workspace cards above the project sections.

**Step 5: Commit**

```bash
git add renderer/components/dashboard/ClientWorkspaceCard.tsx renderer/components/dashboard/Dashboard.tsx renderer/hooks/useProjectContext.tsx renderer/pages/home.tsx
git commit -m "feat: add client workspace cards to dashboard"
```

---

## Task 5: Client Workspace Detail Page

**Files:**
- Create: `renderer/components/client/ClientDetail.tsx`
- Modify: `renderer/pages/home.tsx` (add 'client' page state)

**Step 1: Create ClientDetail page**

Shows: client name, brand assets editor, notes editor, project list for this client, analytics placeholder.

Tabs: Overview | Projects | Analytics (analytics is placeholder, built in Task 8)

**Step 2: Wire into home.tsx routing**

Add `'client'` to the currentPage union. Add state for `selectedClientId`. Render `ClientDetail` when `currentPage === 'client'`.

**Step 3: Verify and commit**

```bash
npx tsc --noEmit
git add renderer/components/client/ClientDetail.tsx renderer/pages/home.tsx
git commit -m "feat: add client workspace detail page with brand assets and notes"
```

---

## Task 6: CC Agents — Data Layer

**Files:**
- Create: `shared/agent-types.ts`
- Create: `main/ipc/agents.ts`
- Modify: `main/background.ts`
- Modify: `main/preload.ts`
- Modify: `shared/types.ts`
- Modify: `renderer/types/electron.d.ts`

**Step 1: Define agent types**

```typescript
// shared/agent-types.ts
export interface Agent {
  id: string;
  name: string;
  icon: string;                    // emoji
  systemPrompt: string;
  model: string;                   // 'claude' (default), future: model selection
  defaultTask?: string;
  timeoutSeconds: number;          // default 900 (15 min)
  createdAt: number;
  updatedAt: number;
}

export interface AgentRun {
  id: string;
  agentId: string;
  agentName: string;
  agentIcon: string;
  task: string;
  projectPath: string;
  clientId?: string;
  status: 'running' | 'completed' | 'failed' | 'killed';
  pid?: number;
  output: string;                  // accumulated stdout
  startedAt: number;
  completedAt?: number;
}

export const DEFAULT_AGENTS: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Code Reviewer',
    icon: '🔍',
    systemPrompt: 'You are a senior code reviewer. Review the code for bugs, security issues, performance problems, and style inconsistencies. Be concise and actionable.',
    model: 'claude',
    defaultTask: 'Review recent changes in this project',
    timeoutSeconds: 600,
  },
  {
    name: 'Documentation',
    icon: '📝',
    systemPrompt: 'You are a documentation specialist. Generate or update documentation for the codebase. Focus on public APIs, component props, and architecture decisions.',
    model: 'claude',
    defaultTask: 'Generate documentation for this project',
    timeoutSeconds: 900,
  },
  {
    name: 'Test Writer',
    icon: '🧪',
    systemPrompt: 'You are a test engineer. Write comprehensive tests for the codebase. Focus on edge cases, error handling, and integration tests.',
    model: 'claude',
    defaultTask: 'Write tests for untested code in this project',
    timeoutSeconds: 900,
  },
  {
    name: 'Refactoring',
    icon: '♻️',
    systemPrompt: 'You are a refactoring specialist. Identify and apply refactoring opportunities. Focus on reducing complexity, eliminating duplication, and improving naming.',
    model: 'claude',
    defaultTask: 'Identify refactoring opportunities in this project',
    timeoutSeconds: 900,
  },
];
```

**Step 2: Create main/ipc/agents.ts**

File-based persistence at `~/.forma/agents.json` and `~/.forma/agent-runs.json`. CRUD for agents + agent spawning via node-pty.

```typescript
// Key spawn function:
async function runAgent(agent: Agent, projectPath: string, task: string): Promise<AgentRun> {
  const run: AgentRun = {
    id: uuidv4(),
    agentId: agent.id,
    agentName: agent.name,
    agentIcon: agent.icon,
    task,
    projectPath,
    status: 'running',
    output: '',
    startedAt: Date.now(),
  };

  const proc = pty.spawn('claude', [
    '--print',
    '--system-prompt', agent.systemPrompt,
    '-p', task,
  ], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: projectPath,
    env: { ...cleanEnv(), TERM: 'xterm-256color' },
  });

  run.pid = proc.pid;
  activeAgentProcesses.set(run.id, proc);

  proc.onData((data: string) => {
    run.output += data;
    // Emit to renderer for live streaming
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.webContents.send('agent-output', { runId: run.id, data });
  });

  proc.onExit(({ exitCode }) => {
    run.status = exitCode === 0 ? 'completed' : 'failed';
    run.completedAt = Date.now();
    activeAgentProcesses.delete(run.id);
    saveRuns();
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.webContents.send('agent-exit', { runId: run.id, status: run.status });
  });

  // Timeout
  setTimeout(() => {
    if (run.status === 'running') {
      proc.kill();
      run.status = 'killed';
      run.completedAt = Date.now();
      activeAgentProcesses.delete(run.id);
      saveRuns();
    }
  }, agent.timeoutSeconds * 1000);

  await saveRuns();
  return run;
}
```

IPC handlers: `get-agents`, `save-agent`, `delete-agent`, `run-agent`, `kill-agent-run`, `get-agent-runs`.

**Step 3: Add IPC channels, register handlers, expose in preload**

Same pattern as Task 1.

**Step 4: Seed default agents on first run**

If `agents.json` doesn't exist, seed from `DEFAULT_AGENTS`.

**Step 5: Verify and commit**

```bash
npx tsc --noEmit
git add shared/agent-types.ts main/ipc/agents.ts main/background.ts main/preload.ts shared/types.ts renderer/types/electron.d.ts
git commit -m "feat: add CC agents data layer with spawn, kill, and default templates"
```

---

## Task 7: CC Agents — UI

**Files:**
- Create: `renderer/hooks/useAgents.ts`
- Create: `renderer/components/agents/AgentLibrary.tsx`
- Create: `renderer/components/agents/AgentCard.tsx`
- Create: `renderer/components/agents/AgentEditor.tsx`
- Create: `renderer/components/agents/AgentRunner.tsx`
- Modify: `renderer/components/layout/Sidebar.tsx` (add "Agents" nav item)
- Modify: `renderer/pages/home.tsx` (add 'agents' page)

**Step 1: Create useAgents hook**

Manages agents list, CRUD, run/kill, and live output streaming via IPC events.

**Step 2: Create AgentLibrary page**

Grid of AgentCards. Each card shows: icon, name, description (first line of system prompt), run count. Click → edit. "Run" button → opens AgentRunner modal.

**Step 3: Create AgentCard component**

Compact card with icon, name, default task preview. Two actions: Edit, Run.

**Step 4: Create AgentEditor**

Modal with fields: name, icon (emoji picker or text input), system prompt (textarea with monospace font), default task, timeout. Save/Cancel buttons.

**Step 5: Create AgentRunner**

Modal/panel that:
1. Lets user pick a project (from project list)
2. Lets user type a task (pre-filled from agent.defaultTask)
3. Shows a "Run" button
4. After running: shows live streaming output (using xterm or simple pre with scroll)
5. Shows status: running/completed/failed/killed
6. "Kill" button while running

**Step 6: Add "Agents" to sidebar**

Add to navItems in Sidebar.tsx:
```typescript
{ id: 'agents', label: 'Agents', icon: <AgentIcon size={16} /> },
```

Create a simple AgentIcon (or reuse an existing one).

**Step 7: Wire into home.tsx**

Add `'agents'` to currentPage union. Import AgentLibrary. Render when `currentPage === 'agents'`.

**Step 8: Add "Run Agent" to ProjectDetail**

In the ProjectDetail "..." dropdown menu, add a "Run Agent" option that opens the AgentRunner with the current project pre-selected.

**Step 9: Verify and commit**

```bash
npx tsc --noEmit
# Test in app: navigate to Agents page, create/edit/run agents
git add renderer/hooks/useAgents.ts renderer/components/agents/ renderer/components/layout/Sidebar.tsx renderer/pages/home.tsx renderer/components/project/ProjectDetail.tsx
git commit -m "feat: add CC agents UI — library, editor, runner with live output"
```

---

## Task 8: Analytics per Client

**Files:**
- Create: `main/ipc/analytics.ts`
- Create: `renderer/hooks/useAnalytics.ts`
- Create: `renderer/components/analytics/ClientAnalytics.tsx`
- Modify: `main/background.ts`
- Modify: `main/preload.ts`
- Modify: `shared/types.ts`
- Modify: `renderer/types/electron.d.ts`

**Step 1: Create analytics parser in main process**

`main/ipc/analytics.ts` reads `~/.claude/projects/{encoded-path}/*.jsonl` files. For each JSONL line, extracts:
- Token counts (from `usage` field in assistant messages)
- Model used
- Timestamp

Groups by project path → maps to client via the project.client field.

```typescript
interface ProjectUsage {
  projectPath: string;
  projectName: string;
  clientName: string | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  sessionCount: number;
  dailyData: { date: string; costUSD: number; inputTokens: number; outputTokens: number; sessionCount: number }[];
}

interface ClientUsage {
  clientName: string;
  projects: ProjectUsage[];
  totalCostUSD: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalSessions: number;
}
```

Cost estimation uses public Anthropic pricing:
- Claude Sonnet: $3/M input, $15/M output
- Claude Opus: $15/M input, $75/M output
- Claude Haiku: $0.25/M input, $1.25/M output

Parse model from JSONL `model` field and apply appropriate pricing.

**Step 2: IPC handler**

`get-analytics(dateRange: number)` — returns `ClientUsage[]` for the last N days.

**Step 3: Create useAnalytics hook**

```typescript
export function useAnalytics(dateRange: number = 30) {
  const [data, setData] = useState<ClientUsage[]>([]);
  const [loading, setLoading] = useState(true);
  // ... fetch on mount and when dateRange changes
}
```

**Step 4: Create ClientAnalytics component**

Renders inside the ClientDetail page (Analytics tab). Shows:
- Summary cards: total cost, total tokens, total sessions, avg cost/session
- Project breakdown table (reuse the table design from the removed UsageSection)
- Date range pills (7d, 30d, 90d)
- Export CSV button

**Step 5: Wire into ClientDetail**

Add Analytics tab to ClientDetail, render `<ClientAnalytics clientName={workspace.name} />`.

**Step 6: Add global analytics to sidebar**

Add Analytics nav item that shows aggregated view across all clients.

**Step 7: Verify and commit**

```bash
npx tsc --noEmit
# Test: open client workspace → Analytics tab → verify cost data appears
git add main/ipc/analytics.ts renderer/hooks/useAnalytics.ts renderer/components/analytics/ main/background.ts main/preload.ts shared/types.ts renderer/types/electron.d.ts
git commit -m "feat: add per-client analytics parsed from Claude Code JSONL sessions"
```

---

## Task 9: CLAUDE.md Manager

**Files:**
- Create: `main/ipc/claudemd.ts`
- Create: `renderer/hooks/useClaudeMd.ts`
- Create: `renderer/components/claudemd/ClaudeMdManager.tsx`
- Create: `renderer/components/claudemd/ClaudeMdTree.tsx`
- Modify: `main/background.ts`
- Modify: `main/preload.ts`
- Modify: `shared/types.ts`
- Modify: `renderer/types/electron.d.ts`
- Modify: `renderer/components/layout/Sidebar.tsx`
- Modify: `renderer/pages/home.tsx`

**Step 1: Create scanner in main process**

`main/ipc/claudemd.ts` recursively scans all registered project paths for:
- `CLAUDE.md` in project root
- `.claude/CLAUDE.md` in project root
- `CLAUDE.md` in subdirectories (1 level deep)

Returns a tree structure:
```typescript
interface ClaudeMdFile {
  path: string;           // absolute path
  projectPath: string;    // parent project
  projectName: string;
  clientName: string | null;
  content: string;
  lastModified: number;
}

interface ClaudeMdTree {
  byClient: Record<string, ClaudeMdFile[]>;  // grouped by client
}
```

IPC handlers: `scan-claudemd`, `read-claudemd(path)`, `write-claudemd(path, content)`.

**Step 2: Create useClaudeMd hook**

Fetches tree on mount. Provides read/write functions.

**Step 3: Create ClaudeMdManager page**

Left panel: tree view grouped by client → project. Right panel: markdown editor (textarea with monospace font) + live preview (rendered markdown via DOMPurify which is already installed).

**Step 4: Add to sidebar and home.tsx**

Nav item: "Instructions" with icon. Route: `currentPage === 'instructions'`.

**Step 5: Verify and commit**

```bash
npx tsc --noEmit
# Test: navigate to Instructions, see tree of all CLAUDE.md files, edit one
git add main/ipc/claudemd.ts renderer/hooks/useClaudeMd.ts renderer/components/claudemd/ main/background.ts main/preload.ts shared/types.ts renderer/types/electron.d.ts renderer/components/layout/Sidebar.tsx renderer/pages/home.tsx
git commit -m "feat: add CLAUDE.md manager with tree view and built-in editor"
```

---

## Task 10: Navigation Update + Polish

**Files:**
- Modify: `renderer/components/layout/Sidebar.tsx`
- Modify: `renderer/pages/home.tsx`
- Modify: `renderer/components/layout/TopBar.tsx` (if breadcrumb update needed)

**Step 1: Update sidebar navigation order**

Final nav items:
```typescript
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon size={16} /> },
  { id: 'agents', label: 'Agents', icon: <AgentIcon size={16} /> },
  { id: 'sessions', label: 'Orchestrator', icon: <ClaudeIcon size={16} /> },
  { id: 'instructions', label: 'Instructions', icon: <EditIcon size={16} /> },
  { id: 'prompts', label: 'Prompts', icon: <PromptsIcon size={16} /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon size={16} /> },
];
```

**Step 2: Update pageTitle mapping in home.tsx**

Add titles for new pages: 'agents' → 'Agents', 'client' → client name, 'instructions' → 'Instructions'.

**Step 3: Final tsc check and build**

```bash
npx tsc --noEmit
npm run build
```

**Step 4: Commit**

```bash
git add renderer/components/layout/Sidebar.tsx renderer/pages/home.tsx
git commit -m "feat: update navigation with agents, instructions, and client workspaces"
```

---

## Verification Checklist

After all tasks complete:

1. `npx tsc --noEmit` — zero errors
2. `npm run build` — builds successfully
3. Open app and verify:
   - [ ] Dashboard shows client workspace cards above projects
   - [ ] Clicking a client card opens ClientDetail with tabs
   - [ ] ClientDetail Overview shows brand assets and notes editors
   - [ ] ClientDetail Projects tab shows filtered project list
   - [ ] ClientDetail Analytics tab shows cost/token data
   - [ ] Agents page shows default agent templates
   - [ ] Can create/edit custom agents
   - [ ] Can run an agent on a project and see live streaming output
   - [ ] Can kill a running agent
   - [ ] Instructions page shows tree of all CLAUDE.md files
   - [ ] Can edit and save a CLAUDE.md file
   - [ ] Navigation updated with all new sections
   - [ ] No regressions: existing orchestrator, settings, prompts still work

---

## Task Dependency Graph

```
Task 1 (Client Data Layer)
  └── Task 2 (Client Hook)
       └── Task 3 (Auto-Seed)
            └── Task 4 (Dashboard Cards)
                 └── Task 5 (Client Detail Page)
                      └── Task 8 (Analytics)

Task 6 (Agent Data Layer)
  └── Task 7 (Agent UI)

Task 9 (CLAUDE.md Manager) — independent

Task 10 (Navigation Polish) — depends on Tasks 5, 7, 9
```

**Parallelizable:** Tasks 1-5 (clients) and Task 6-7 (agents) and Task 9 (CLAUDE.md) can run in parallel tracks.
