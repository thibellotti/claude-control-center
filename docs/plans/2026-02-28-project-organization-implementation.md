# Project Organization by Client + Auto-Session Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Group projects by client (parsed from CLAUDE.md) in an accordion Dashboard, and auto-launch Orchestrator with Claude + Preview when opening a project.

**Architecture:** Add `client` field to Project type, parse it from CLAUDE.md in the main process, rewrite Dashboard with accordion groups, and wire project-open to Orchestrator auto-session creation via state passed through home.tsx.

**Tech Stack:** React 18, Next.js 14, TypeScript, Electron IPC, TailwindCSS

---

### Task 1: Add `client` field to Project type

**Files:**
- Modify: `shared/types.ts:59-74`

**Step 1: Add client field to Project interface**

In `shared/types.ts`, add `client` after `hasClaudeDir`:

```typescript
export interface Project {
  id: string;
  name: string;
  path: string;
  claudeConfigPath: string | null;
  git: GitInfo | null;
  plan: string | null;
  claudeMd: string | null;
  packageJson: PackageJsonInfo | null;
  tasks: TaskItem[];
  teams: Team[];
  lastActivity: number;
  status: 'active' | 'idle';
  hasClaudeDir: boolean;
  client: string | null;
  health: ProjectHealth | null;
}
```

**Step 2: Commit**

```bash
git add shared/types.ts
git commit -m "feat(projects): add client field to Project type"
```

---

### Task 2: Parse `client:` from CLAUDE.md in project discovery

**Files:**
- Modify: `main/ipc/projects.ts:132-236`

**Step 1: Add parseClient helper**

Add this function before `buildProjectSummary`:

```typescript
function parseClient(claudeMd: string | null): string | null {
  if (!claudeMd) return null;
  const match = claudeMd.match(/^client:\s*(.+)$/mi);
  return match ? match[1].trim() : null;
}
```

**Step 2: Use parseClient in buildProjectSummary return**

In the return object of `buildProjectSummary` (around line 216), add `client` field:

```typescript
return {
  id,
  name,
  path: projectPath,
  claudeConfigPath,
  git,
  plan,
  claudeMd,
  packageJson,
  tasks,
  teams,
  lastActivity,
  status,
  hasClaudeDir,
  client: parseClient(claudeMd),
  health,
};
```

**Step 3: Commit**

```bash
git add main/ipc/projects.ts
git commit -m "feat(projects): parse client field from CLAUDE.md"
```

---

### Task 3: Rewrite Dashboard with accordion groups by client

**Files:**
- Modify: `renderer/components/dashboard/Dashboard.tsx`

**Step 1: Replace the entire Dashboard component**

Replace the contents of `Dashboard.tsx` with:

```typescript
import React, { useCallback, useMemo, useState } from 'react';
import { useProjectContext } from '../../hooks/useProjectContext';
import ProjectCard from './ProjectCard';
import ActiveSessions from './ActiveSessions';
import { ChevronDownIcon } from '../icons';

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
  warn?: boolean;
}

function StatCard({ label, value, accent, warn }: StatCardProps) {
  let valueColor = 'text-text-primary';
  if (accent) valueColor = 'text-accent';
  if (warn) valueColor = 'text-status-dirty';

  return (
    <div className="flex-1 min-w-[140px] bg-surface-1 border border-border-subtle rounded-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1">
        {label}
      </p>
      <p className={`text-2xl font-semibold ${valueColor}`}>{value}</p>
    </div>
  );
}

interface ClientGroup {
  client: string;
  projects: ReturnType<typeof useProjectContext>['projects'];
  lastActivity: number;
  hasActive: boolean;
}

export default function Dashboard() {
  const { projects, onSelectProject, activeSessions, getSessionForProject } = useProjectContext();

  // Group projects by client
  const clientGroups = useMemo((): ClientGroup[] => {
    const groupMap = new Map<string, ClientGroup>();

    for (const project of projects) {
      const client = project.client || 'Uncategorized';
      if (!groupMap.has(client)) {
        groupMap.set(client, {
          client,
          projects: [],
          lastActivity: 0,
          hasActive: false,
        });
      }
      const group = groupMap.get(client)!;
      group.projects.push(project);
      if (project.lastActivity > group.lastActivity) {
        group.lastActivity = project.lastActivity;
      }
      if (project.status === 'active') {
        group.hasActive = true;
      }
    }

    // Sort projects within each group by recency
    for (const group of groupMap.values()) {
      group.projects.sort((a, b) => b.lastActivity - a.lastActivity);
    }

    // Sort groups: active clients first, then by recency. "Uncategorized" always last.
    const groups = Array.from(groupMap.values());
    groups.sort((a, b) => {
      if (a.client === 'Uncategorized') return 1;
      if (b.client === 'Uncategorized') return -1;
      if (a.hasActive !== b.hasActive) return a.hasActive ? -1 : 1;
      return b.lastActivity - a.lastActivity;
    });

    return groups;
  }, [projects]);

  // Track which accordions are open — active clients default open
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((client: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(client)) {
        next.delete(client);
      } else {
        next.add(client);
      }
      return next;
    });
  }, []);

  const handleOpenEditor = useCallback((path: string) => {
    window.api.openInEditor(path);
  }, []);

  // Stats
  const { totalTasks, activeTasks, uncommitted, liveCount } = useMemo(() => {
    const total = projects.reduce((sum, p) => sum + p.tasks.length, 0);
    const activeT = projects.reduce(
      (sum, p) => sum + p.tasks.filter((t) => t.status === 'in_progress').length,
      0
    );
    const dirty = projects.filter((p) => p.git && p.git.status === 'dirty').length;
    return {
      totalTasks: total,
      activeTasks: activeT,
      uncommitted: dirty,
      liveCount: activeSessions.length,
    };
  }, [projects, activeSessions]);

  return (
    <div className="p-6 space-y-8">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-4">
        <StatCard label="Projects" value={projects.length} />
        <StatCard label="Clients" value={clientGroups.filter((g) => g.client !== 'Uncategorized').length} />
        <StatCard label="Tasks" value={`${activeTasks}/${totalTasks}`} />
        <StatCard label="Uncommitted" value={uncommitted} warn={uncommitted > 0} />
        <StatCard label="Live Sessions" value={liveCount} accent={liveCount > 0} />
      </div>

      {/* Live sessions */}
      <ActiveSessions sessions={activeSessions} />

      {/* Client groups */}
      {clientGroups.map((group) => {
        const isOpen = !collapsed.has(group.client);

        return (
          <section key={group.client}>
            <button
              onClick={() => toggleGroup(group.client)}
              className="flex items-center gap-2 w-full text-left mb-3 group"
            >
              <span
                className={`transition-transform duration-200 text-text-tertiary ${isOpen ? '' : '-rotate-90'}`}
              >
                <ChevronDownIcon size={14} />
              </span>
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary group-hover:text-text-secondary transition-colors">
                {group.client}
              </h2>
              <span className="text-[11px] text-text-tertiary/60">
                ({group.projects.length})
              </span>
              {group.hasActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-status-active" />
              )}
            </button>

            {isOpen && (
              <div className="grid gap-4 ml-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {group.projects.map((project) => (
                  <ProjectCard
                    key={project.path}
                    project={project}
                    onClick={onSelectProject}
                    onOpenEditor={handleOpenEditor}
                    isLive={!!getSessionForProject(project.path)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-tertiary text-sm">No projects found.</p>
          <p className="text-text-tertiary text-xs mt-1">
            Projects with a .claude directory will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify ChevronDownIcon exists**

Check `renderer/components/icons/index.tsx` for `ChevronDownIcon`. If missing, add it.

**Step 3: Commit**

```bash
git add renderer/components/dashboard/Dashboard.tsx
git commit -m "feat(dashboard): rewrite with accordion groups by client"
```

---

### Task 4: Add auto-session launch to OrchestratorPage

**Files:**
- Modify: `renderer/components/orchestrator/OrchestratorPage.tsx`

**Step 1: Accept initialProject prop**

Add an optional prop for the initial project to auto-open:

```typescript
interface OrchestratorPageProps {
  initialProject?: {
    path: string;
    mode: 'claude' | 'claude --dangerously-skip-permissions';
  };
}

export default function OrchestratorPage({ initialProject }: OrchestratorPageProps) {
```

**Step 2: Add auto-session effect**

After the existing `restoreWorkspace` effect, add:

```typescript
// Auto-create cells when opening from a project
const initializedRef = useRef(false);
useEffect(() => {
  if (!initialProject || initializedRef.current) return;
  initializedRef.current = true;

  // Clear any existing cells for a fresh workspace
  orchestrator.cells.forEach((c) => {
    if (c.config.type === 'terminal' && c.config.sessionId) {
      killSession(c.config.sessionId);
    }
  });

  // Set split layout
  orchestrator.setLayout('split');

  // Create terminal + preview after a tick (let layout settle)
  setTimeout(async () => {
    const sessionId = await createSession(initialProject.path, initialProject.mode);
    const isAutopilot = initialProject.mode.includes('--dangerously-skip-permissions');
    orchestrator.addCell({
      type: 'terminal',
      sessionId,
      label: isAutopilot ? 'Claude Autopilot' : 'Claude',
      cwd: initialProject.path,
      command: initialProject.mode,
    });

    orchestrator.addCell({
      type: 'preview',
      url: 'http://localhost:3000',
      label: 'Preview',
      projectPath: initialProject.path,
    });
  }, 100);
}, [initialProject]);
```

**Step 3: Add useRef import**

Make sure `useRef` is imported from React at the top.

**Step 4: Commit**

```bash
git add renderer/components/orchestrator/OrchestratorPage.tsx
git commit -m "feat(orchestrator): auto-create Claude + Preview cells when opening project"
```

---

### Task 5: Wire project open → mode dialog → Orchestrator in home.tsx

**Files:**
- Modify: `renderer/pages/home.tsx`

**Step 1: Add state for project launch**

Add state to track project being launched and the mode dialog:

```typescript
const [launchProject, setLaunchProject] = useState<{ path: string; mode: string } | null>(null);
const [showModeDialog, setShowModeDialog] = useState<string | null>(null); // project path
```

**Step 2: Modify handleSelectProject**

Change the handler to show mode dialog instead of navigating to project detail:

```typescript
const handleSelectProject = useCallback((project: Project) => {
  setShowModeDialog(project.path);
}, []);
```

**Step 3: Add mode selection handler**

```typescript
const handleLaunchProject = useCallback((projectPath: string, mode: 'claude' | 'claude --dangerously-skip-permissions') => {
  setShowModeDialog(null);
  setLaunchProject({ path: projectPath, mode });
  setCurrentPage('sessions');
}, []);
```

**Step 4: Pass initialProject to OrchestratorPage**

Update the Orchestrator render:

```typescript
{currentPage === 'sessions' && (
  <OrchestratorPage
    initialProject={launchProject ? { path: launchProject.path, mode: launchProject.mode as 'claude' | 'claude --dangerously-skip-permissions' } : undefined}
  />
)}
```

**Step 5: Add mode dialog**

Before the closing `</ProjectProvider>`, add:

```typescript
{showModeDialog && (
  <>
    <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowModeDialog(null)} />
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-surface-1 border border-border-subtle rounded-card p-6 shadow-xl min-w-[320px]">
      <p className="text-sm font-medium text-text-primary mb-1">
        Open: {showModeDialog.split('/').pop()}
      </p>
      <p className="text-xs text-text-tertiary mb-4">Choose how to start Claude Code</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleLaunchProject(showModeDialog, 'claude')}
          className="flex-1 px-4 py-2.5 rounded-button text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          Claude
        </button>
        <button
          onClick={() => handleLaunchProject(showModeDialog, 'claude --dangerously-skip-permissions')}
          className="flex-1 px-4 py-2.5 rounded-button text-sm font-medium bg-surface-2 border border-border-subtle text-feedback-warning hover:bg-surface-3 transition-colors"
        >
          Autopilot
        </button>
      </div>
    </div>
  </>
)}
```

**Step 6: Clear launchProject when navigating away**

In `handleNavigate`, reset launch state:

```typescript
const handleNavigate = useCallback((page: string) => {
  if (page === 'dashboard' || page === 'settings' || page === 'prompts' || page === 'workspaces' || page === 'usage' || page === 'terminal' || page === 'sessions') {
    setCurrentPage(page);
    setSelectedProjectPath(null);
    if (page !== 'sessions') {
      setLaunchProject(null);
    }
  }
}, []);
```

**Step 7: Commit**

```bash
git add renderer/pages/home.tsx
git commit -m "feat: wire project open to mode dialog and Orchestrator auto-session"
```

---

### Task 6: Add `client:` to existing project CLAUDE.md files

**Files:**
- Check and update CLAUDE.md in each project under ~/Projects/

**Step 1: Add client field to known projects**

For each project that has a CLAUDE.md, add `client: ClientName` at the top. For projects without CLAUDE.md, create one with just the client line.

Example for thxtype:
```
client: THXType
```

Example for claude-control-center:
```
client: THXType
```

**Step 2: Commit each project separately (in their own repos)**

---

### Task 7: Test and verify

**Step 1: Run dev server**

```bash
cd /Users/thiagobellotti/Projects/claude-control-center && npm run dev
```

**Step 2: Verify Dashboard shows accordion groups**

Navigate to Dashboard. Projects with `client:` should be grouped under their client name. Others under "Uncategorized".

**Step 3: Test project open flow**

Click a project card → mode dialog appears → select "Claude" → Orchestrator opens in split with terminal + preview.

**Step 4: Test autopilot**

Click another project → select "Autopilot" → verify terminal runs `claude --dangerously-skip-permissions`.

**Step 5: Test accordion**

Click client header to collapse/expand. Verify state persists during session.

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete project organization by client with auto-session"
```
