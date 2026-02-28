# Live Preview + Integration Panels Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the project view into a Plush-inspired split-pane IDE with always-visible live preview, auto-refresh on file changes, console capture, and Supabase/Vercel/GitHub dashboard panels.

**Architecture:** The right side of the project view becomes a persistent resizable WorkspacePanel with 4 switchable tabs (Preview, Supabase, Vercel, GitHub). The preview system is upgraded from polling to event-driven with chokidar file watching, iframe postMessage bridge for console capture, and a status machine. Integration panels use existing MCP tools and IPC handlers.

**Tech Stack:** React, react-resizable-panels, chokidar, Electron IPC, xterm.js (existing), Tailwind CSS

---

### Task 1: Install react-resizable-panels and add types

**Files:**
- Modify: `package.json`
- Modify: `shared/types.ts`

**What to do:**

1. Install the dependency:
```bash
npm install react-resizable-panels
```

2. Add new types and IPC channels to `shared/types.ts`:

Add to the types section:
```typescript
export type PreviewStatus = 'idle' | 'detecting' | 'installing' | 'starting' | 'ready' | 'error';

export interface EnhancedPreviewState {
  status: PreviewStatus;
  url: string | null;
  port: number | null;
  output: string[];
  error: string | null;
  consoleEntries: ConsoleEntry[];
  scriptName: string | null;
}

export interface ConsoleEntry {
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
}

export interface SupabaseProjectInfo {
  projectUrl: string | null;
  tables: { name: string; schema: string; rowCount: number | null }[];
  advisors: { level: string; title: string; detail: string; url: string }[];
}

export interface VercelDeployment {
  url: string;
  state: string;
  createdAt: number;
  source: string;
}

export interface GitHubPRInfo {
  number: number;
  title: string;
  state: string;
  author: string;
  updatedAt: string;
  url: string;
}
```

Add these IPC channels:
```typescript
PREVIEW_FILE_CHANGED: 'preview-file-changed',
PREVIEW_STATUS_UPDATE: 'preview-status-update',
PREVIEW_START_WATCHING: 'preview-start-watching',
PREVIEW_STOP_WATCHING: 'preview-stop-watching',
```

3. Commit:
```bash
git add package.json package-lock.json shared/types.ts
git commit -m "feat: add react-resizable-panels and types for live preview + integrations"
```

---

### Task 2: Upgrade preview IPC to event-driven with file watching

**Files:**
- Modify: `main/ipc/preview.ts`
- Modify: `main/background.ts`
- Modify: `main/preload.ts`

**What to do:**

Rewrite `main/ipc/preview.ts` to:

1. **Status machine**: Track server state as `PreviewStatus` (idle → detecting → installing → starting → ready → error)
2. **Push updates**: Use `BrowserWindow.webContents.send()` to push status updates instead of waiting for polling
3. **File watching**: When preview starts, begin watching the project's `src/`, `app/`, `pages/`, `public/`, `components/` directories with chokidar. On file change, push `PREVIEW_FILE_CHANGED` event to renderer.
4. **Detect script**: Before spawning, check which script exists (dev/start/serve) and report it in the status
5. **Output streaming**: Push output lines to renderer as they happen via `PREVIEW_STATUS_UPDATE`

Key changes to the IPC handler:
- `START_DEV_SERVER` now pushes status updates as server progresses through states
- Add `PREVIEW_START_WATCHING` handler that starts chokidar watcher for a project path
- Add `PREVIEW_STOP_WATCHING` handler that stops the watcher
- `STOP_DEV_SERVER` also stops the file watcher

Add to `main/preload.ts`:
```typescript
onPreviewFileChanged: (callback) => {
  const handler = (_, payload) => callback(payload);
  ipcRenderer.on(IPC_CHANNELS.PREVIEW_FILE_CHANGED, handler);
  return () => { ipcRenderer.removeListener(IPC_CHANNELS.PREVIEW_FILE_CHANGED, handler); };
},
onPreviewStatusUpdate: (callback) => {
  const handler = (_, payload) => callback(payload);
  ipcRenderer.on(IPC_CHANNELS.PREVIEW_STATUS_UPDATE, handler);
  return () => { ipcRenderer.removeListener(IPC_CHANNELS.PREVIEW_STATUS_UPDATE, handler); };
},
previewStartWatching: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.PREVIEW_START_WATCHING, projectPath),
previewStopWatching: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.PREVIEW_STOP_WATCHING, projectPath),
```

Register in `main/background.ts` (already registered, just ensure the watcher cleanup is added to `before-quit`).

Commit:
```bash
git add main/ipc/preview.ts main/preload.ts main/background.ts
git commit -m "feat: upgrade preview to event-driven with file watching and status machine"
```

---

### Task 3: Rewrite PreviewPanel with console capture and responsive viewport

**Files:**
- Rewrite: `renderer/components/preview/PreviewPanel.tsx`
- Rewrite: `renderer/components/preview/PreviewToolbar.tsx`
- Rewrite: `renderer/hooks/usePreview.ts`

**What to do:**

**usePreview.ts** — Complete rewrite:
- Listen to `onPreviewStatusUpdate` for server state changes (event-driven, no polling)
- Listen to `onPreviewFileChanged` for auto-refresh (debounce 300ms)
- Track `EnhancedPreviewState` with status machine
- Track `ConsoleEntry[]` from iframe postMessage bridge
- Track viewport: `{ mode: 'desktop' | 'tablet' | 'mobile' | 'custom', width: number }`
- Expose: `start()`, `stop()`, `refresh()`, `setViewport()`, `clearConsole()`
- Auto-start file watching when server starts, stop when server stops

**PreviewPanel.tsx** — Full rewrite:
- **Status bar at top**: Shows current status with colored dot (idle=gray, detecting=yellow, installing=yellow, starting=blue, ready=green, error=red) and status text
- **Toolbar**: Start/Stop, URL display, refresh, viewport presets, custom width input, open in browser
- **Iframe area**: Takes full available height (not fixed 600px), responsive width centered
- **Console panel at bottom**: Collapsible, shows console entries with level-colored badges (log=gray, warn=yellow, error=red, info=blue), auto-scrolls, clear button
- **Console capture**: Wrap the iframe src in a proxy page that injects `console` override script sending `postMessage` to parent. The parent `window.addEventListener('message')` captures these and adds to consoleEntries.
- **Auto-refresh indicator**: When file change is detected, show a brief "Refreshing..." flash

**PreviewToolbar.tsx** — Rewrite:
- More compact, horizontal layout
- Viewport buttons with width labels
- Custom width input (number field)
- URL field is a clickable link
- Status dot integrated into toolbar

**Console capture strategy** (important detail):
Since we run actual dev servers (not WebContainer), the iframe loads a real localhost URL. We can't inject scripts into cross-origin iframes. Instead:
- For console capture: Proxy the iframe through a local middleware that injects a script tag, OR accept that console capture only works for same-origin previews
- **Practical approach**: Add a small console panel that shows the dev server's stdout/stderr (which we already capture). This gives the equivalent of "console output" without cross-origin issues. Errors from the server process are the most useful anyway.

Commit:
```bash
git add renderer/components/preview/ renderer/hooks/usePreview.ts
git commit -m "feat: rewrite preview with event-driven updates, status machine, and console"
```

---

### Task 4: Create Supabase dashboard panel

**Files:**
- Create: `renderer/components/integrations/SupabasePanel.tsx`
- Create: `renderer/hooks/useSupabase.ts`
- Create: `main/ipc/supabase-info.ts`

**What to do:**

**main/ipc/supabase-info.ts**:
- IPC handler `GET_SUPABASE_INFO` that checks if a project has `@supabase/supabase-js` in dependencies
- Returns basic detection info (has supabase, env vars present, etc.)

**useSupabase.ts** hook:
- Detects if project uses Supabase (checks package.json dependencies)
- Uses the existing MCP tools via main process to fetch:
  - `mcp__supabase__list_tables` — table listing
  - `mcp__supabase__get_logs` — recent logs (postgres, auth)
  - `mcp__supabase__get_advisors` — security/performance advisors
  - `mcp__supabase__get_project_url` — project API URL
- Caches results, refreshes on demand
- Note: MCP tools run in the Claude CLI context, not in our Electron app. So this panel shows a "Connect via Claude" prompt and instructions, OR uses the Supabase Management API directly if we detect `SUPABASE_ACCESS_TOKEN` in environment.

**Practical approach for Supabase panel** (since MCP tools aren't directly callable from Electron):
- Detect if project has Supabase dependency
- Show project info (from package.json)
- Show env vars detection (.env file scan for SUPABASE_URL, SUPABASE_ANON_KEY)
- "Open Supabase Dashboard" button (opens browser to supabase.com/dashboard)
- Show Supabase-related logs from recent Claude sessions (parse JSONL for Supabase tool calls)
- Quick copy of connection strings

**SupabasePanel.tsx**:
- Header with Supabase logo/icon and connection status
- Environment section: detected env vars (masked values)
- Quick actions: Open Dashboard, Copy URL, Copy Anon Key
- Recent activity: Supabase-related tool calls from Claude sessions

Commit:
```bash
git add renderer/components/integrations/SupabasePanel.tsx renderer/hooks/useSupabase.ts main/ipc/supabase-info.ts
git commit -m "feat: add Supabase integration dashboard panel"
```

---

### Task 5: Create Vercel dashboard panel

**Files:**
- Create: `renderer/components/integrations/VercelPanel.tsx`
- Create: `renderer/hooks/useVercel.ts`
- Modify: `main/ipc/deploy.ts` (add deployment list via `vercel ls`)

**What to do:**

**Extend main/ipc/deploy.ts**:
- Add `GET_VERCEL_DEPLOYMENTS` handler that runs `vercel ls --json` to get deployment list
- Add `GET_VERCEL_PROJECT_INFO` handler that runs `vercel project ls --json` or reads `.vercel/project.json`
- Parse JSON output into structured data

**useVercel.ts** hook:
- Detect Vercel project (check `.vercel/` directory and `vercel.json`)
- Fetch recent deployments via new IPC handler
- Get current production URL
- Track deploy history (existing `getDeployHistory`)
- Expose: `deploy()`, `refresh()`, `openDashboard()`

**VercelPanel.tsx**:
- Header with Vercel icon, project name, production URL (clickable)
- "Deploy" button (prominent, uses existing deploy IPC)
- Deployment list: status badge (ready/building/error), URL, timestamp, source (git/cli)
- Build output: last deploy's output log (scrollable)
- Quick links: Open Vercel Dashboard, View Production, View Logs

Commit:
```bash
git add renderer/components/integrations/VercelPanel.tsx renderer/hooks/useVercel.ts main/ipc/deploy.ts
git commit -m "feat: add Vercel integration dashboard panel"
```

---

### Task 6: Create GitHub dashboard panel

**Files:**
- Create: `renderer/components/integrations/GitHubPanel.tsx`
- Create: `renderer/hooks/useGitHub.ts`
- Create: `main/ipc/github-info.ts`

**What to do:**

**main/ipc/github-info.ts**:
- `GET_GITHUB_INFO` handler that:
  - Runs `git remote get-url origin` to get GitHub URL
  - Parses owner/repo from URL
  - Runs `gh pr list --json number,title,state,author,updatedAt,url --limit 5` for recent PRs
  - Runs `gh api repos/{owner}/{repo}/commits?per_page=10` for recent commits
  - Returns structured data

**useGitHub.ts** hook:
- Uses project's git info (already available in Project type)
- Fetches PRs and commits via new IPC handler
- Parses GitHub remote URL to extract owner/repo
- Expose: `refresh()`, `openRepo()`, `openPR(number)`, `createPR()`

**GitHubPanel.tsx**:
- Header with GitHub icon, repo name (clickable), branch badge
- Git status: ahead/behind indicators, dirty/clean badge
- Recent commits (5): hash, message, author, relative time
- Open PRs: title, status badge, author, link
- Quick actions: Open Repo, Create PR, Push, Pull

Commit:
```bash
git add renderer/components/integrations/GitHubPanel.tsx renderer/hooks/useGitHub.ts main/ipc/github-info.ts
git commit -m "feat: add GitHub integration dashboard panel"
```

---

### Task 7: Create WorkspacePanel container with tab switching

**Files:**
- Create: `renderer/components/workspace-panel/WorkspacePanel.tsx`
- Create: `renderer/components/workspace-panel/PanelTabBar.tsx`

**What to do:**

**WorkspacePanel.tsx**:
- Container component that receives `project: Project` and `projectPath: string`
- Manages active tab state: `'preview' | 'supabase' | 'vercel' | 'github'`
- Conditionally shows tabs based on project capabilities:
  - Preview: always shown if project has dev/start/serve script
  - Supabase: shown if `@supabase/supabase-js` in dependencies
  - Vercel: shown if `.vercel/` directory exists or `vercel.json` present
  - GitHub: shown if project has git remote
- Renders the active panel component
- Takes full height of container

**PanelTabBar.tsx**:
- Horizontal tab bar at top of the workspace panel
- Each tab: icon + label, active state with accent bottom border
- Compact design (smaller than main project tabs)
- Icons: Globe (preview), Database (supabase), Triangle (vercel), Git (github)

Commit:
```bash
git add renderer/components/workspace-panel/
git commit -m "feat: add WorkspacePanel container with integration tab switching"
```

---

### Task 8: Wire split-pane layout into AppLayout

**Files:**
- Modify: `renderer/components/layout/AppLayout.tsx`
- Modify: `renderer/pages/home.tsx`
- Modify: `renderer/components/project/ProjectDetail.tsx`

**What to do:**

**AppLayout.tsx**:
- Import `PanelGroup`, `Panel`, `PanelResizeHandle` from `react-resizable-panels`
- When a project is selected (passed via prop), render main content area as a split pane:
  ```
  <PanelGroup direction="horizontal">
    <Panel defaultSize={55} minSize={30}>
      {children} {/* ProjectDetail */}
    </Panel>
    <PanelResizeHandle className="w-1 bg-border-subtle hover:bg-accent transition-colors" />
    <Panel defaultSize={45} minSize={25}>
      <WorkspacePanel project={selectedProject} />
    </Panel>
  </PanelGroup>
  ```
- When NO project is selected (dashboard, settings, etc.), render children normally without split pane

**home.tsx**:
- Pass `selectedProject` to AppLayout so it knows when to show the split pane
- The WorkspacePanel only renders when `currentPage === 'project'`

**ProjectDetail.tsx**:
- Remove the `preview` tab and its `<PreviewPanel>` rendering (preview now lives in WorkspacePanel)
- Remove the `deploy` tab (now in Vercel panel)
- Keep all other tabs (overview, tasks, teams, sessions, replay, diff, design, components, tokens, handoff)

Commit:
```bash
git add renderer/components/layout/AppLayout.tsx renderer/pages/home.tsx renderer/components/project/ProjectDetail.tsx
git commit -m "feat: wire split-pane layout with WorkspacePanel for project views"
```

---

### Build & Verify

After all tasks, run:
```bash
npm run build
```

Expected: Successful build with DMG output.

Then install and test:
```bash
pkill -f "Claude Control Center" 2>/dev/null
sleep 1
rm -rf "/Applications/Claude Control Center.app"
cp -R "dist/mac-arm64/Claude Control Center.app" /Applications/
open "/Applications/Claude Control Center.app"
```

Test checklist:
- [ ] Split pane appears when selecting a project
- [ ] Split pane disappears on dashboard/settings/etc pages
- [ ] Resize handle works smoothly
- [ ] Preview tab starts/stops dev server
- [ ] File changes trigger auto-refresh
- [ ] Console shows server output
- [ ] Viewport presets work
- [ ] Supabase panel shows for Supabase projects
- [ ] Vercel panel shows deployment info
- [ ] GitHub panel shows commits and PRs
- [ ] Tab switching in WorkspacePanel works
- [ ] Terminal page still works
- [ ] All other features still work
