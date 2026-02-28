# Claude Studio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Claude Control Center into "Claude Studio" — a designer-friendly desktop app for operating Claude Code projects with premium UX, preview panels, Figma integration, prompt libraries, visual editors, and deploy workflows.

**Architecture:** Electron main process gains new IPC modules for each feature domain (preview, prompts, deploy, tokens). Renderer adds new page-level views and reusable components following existing patterns (hooks + components + shared types). BrowserView for live preview, Monaco-style editors for CLAUDE.md, and local JSON storage for prompt library. All new features plug into the existing AppLayout sidebar navigation.

**Tech Stack:** Electron 34, Next.js 14, React 18, TailwindCSS 3.4, chokidar, simple-git, node:child_process, node:fs

---

## Batch 1: Core Designer Tools (Tasks 1–4)

These are the highest-impact features that immediately transform the app for designers.

---

### Task 1: CLAUDE.md Visual Editor

Build a block-based visual editor for CLAUDE.md files so designers can manage project instructions without touching markdown.

**Files:**
- Create: `renderer/components/editor/ClaudeMdEditor.tsx`
- Create: `renderer/components/editor/EditorBlock.tsx`
- Create: `renderer/hooks/useClaudeMdEditor.ts`
- Create: `main/ipc/files.ts`
- Modify: `shared/types.ts` — add `ClaudeMdBlock`, `IPC_CHANNELS.READ_FILE`, `IPC_CHANNELS.WRITE_FILE`
- Modify: `main/background.ts` — register file handlers
- Modify: `main/preload.ts` — expose readFile, writeFile
- Modify: `renderer/components/project/ProjectDetail.tsx` — add "Edit" button for CLAUDE.md tab

**Step 1: Add IPC channels for file read/write**

In `shared/types.ts`, add to IPC_CHANNELS:
```typescript
READ_FILE: 'read-file',
WRITE_FILE: 'write-file',
```

Add types:
```typescript
export interface ClaudeMdBlock {
  id: string;
  type: 'heading' | 'rule' | 'text' | 'list' | 'code';
  content: string;
  level?: number; // for headings (1-6)
  language?: string; // for code blocks
}
```

**Step 2: Create `main/ipc/files.ts`**

```typescript
import { ipcMain } from 'electron';
import { readFileSync, writeFileSync, existsSync } from 'fs';

export function registerFileHandlers() {
  ipcMain.handle('read-file', async (_, filePath: string) => {
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath, 'utf-8');
  });

  ipcMain.handle('write-file', async (_, filePath: string, content: string) => {
    writeFileSync(filePath, content, 'utf-8');
    return true;
  });
}
```

**Step 3: Register in background.ts and preload.ts**

Add `registerFileHandlers()` to background.ts.
Add `readFile` and `writeFile` to preload API.

**Step 4: Create `renderer/hooks/useClaudeMdEditor.ts`**

Hook that:
- Takes a file path, loads content via `window.api.readFile(path)`
- Parses markdown into `ClaudeMdBlock[]` array (split by headings, code blocks, lists, paragraphs)
- Provides `addBlock`, `updateBlock`, `removeBlock`, `moveBlock`, `save` methods
- `save` serializes blocks back to markdown and calls `window.api.writeFile(path, content)`
- Tracks `isDirty` state

**Step 5: Create `renderer/components/editor/EditorBlock.tsx`**

Each block renders as:
- **heading**: Input field with level selector (H1-H4)
- **text**: Textarea with auto-resize
- **list**: Bulleted list items with add/remove
- **code**: Monospace textarea with optional language label
- **rule**: Visual divider (non-editable, just `---`)
- Drag handle on left, delete button on right
- Hover states for block actions

**Step 6: Create `renderer/components/editor/ClaudeMdEditor.tsx`**

Main editor component:
- Renders blocks in order using EditorBlock
- "Add block" button at bottom with type picker dropdown
- Save button (disabled when !isDirty) with Cmd+S keyboard shortcut
- "View raw" toggle to see plain markdown
- Uses the project's CLAUDE.md path

**Step 7: Wire into ProjectDetail.tsx**

Add an "Edit" button next to the CLAUDE.md tab. When clicked, replaces the MarkdownView with ClaudeMdEditor. Toggle between view/edit modes.

---

### Task 2: Prompt Library & Templates

Local prompt library with categories, favorites, and quick-insert into Claude sessions.

**Files:**
- Create: `renderer/components/prompts/PromptLibrary.tsx`
- Create: `renderer/components/prompts/PromptCard.tsx`
- Create: `renderer/components/prompts/PromptEditor.tsx`
- Create: `renderer/hooks/usePromptLibrary.ts`
- Create: `main/ipc/prompts.ts`
- Modify: `shared/types.ts` — add `Prompt`, `PromptCategory` types, IPC channels
- Modify: `main/background.ts` — register prompt handlers
- Modify: `main/preload.ts` — expose prompt API
- Modify: `renderer/pages/home.tsx` — add 'prompts' page option
- Modify: `renderer/components/layout/Sidebar.tsx` — add Prompts nav item

**Step 1: Define types in `shared/types.ts`**

```typescript
export interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}
```

Add IPC channels: `GET_PROMPTS`, `SAVE_PROMPT`, `DELETE_PROMPT`.

**Step 2: Create `main/ipc/prompts.ts`**

Store prompts as JSON files in `~/.claude/studio/prompts/`.
- `getPrompts()` reads all JSON files from the directory
- `savePrompt(prompt)` writes/updates a prompt file
- `deletePrompt(id)` removes the file
- Include 5 built-in starter prompts (coding style, component creation, bug fix, refactor, review)

**Step 3: Create hooks and components**

- `usePromptLibrary` hook: CRUD operations, search/filter, category grouping
- `PromptLibrary` page: search bar, category filter tabs, grid of PromptCards
- `PromptCard`: title, preview, category tag, favorite star, copy button
- `PromptEditor`: modal/slide-over for creating/editing prompts with title, content textarea, category dropdown, tags input

**Step 4: Add to navigation**

Add "Prompts" to Sidebar.tsx and handle in home.tsx routing.

---

### Task 3: Built-in Preview Panel

Live preview panel using Electron BrowserView to show the project's running dev server.

**Files:**
- Create: `renderer/components/preview/PreviewPanel.tsx`
- Create: `renderer/components/preview/PreviewToolbar.tsx`
- Create: `renderer/hooks/usePreview.ts`
- Create: `main/ipc/preview.ts`
- Modify: `shared/types.ts` — add `PreviewState`, IPC channels
- Modify: `main/background.ts` — register preview handlers
- Modify: `main/preload.ts` — expose preview API
- Modify: `renderer/components/project/ProjectDetail.tsx` — add Preview tab

**Step 1: Define types**

```typescript
export interface PreviewState {
  url: string | null;
  isLoading: boolean;
  devServerRunning: boolean;
  port: number | null;
}
```

Add IPC channels: `START_DEV_SERVER`, `STOP_DEV_SERVER`, `GET_PREVIEW_STATE`.

**Step 2: Create `main/ipc/preview.ts`**

- `startDevServer(projectPath)`: reads package.json scripts, spawns `npm run dev` (or `next dev`, `vite`, etc.), detects port from stdout
- `stopDevServer(projectPath)`: kills the spawned process
- `getPreviewState(projectPath)`: returns current state (url, port, running)
- Track spawned processes in a Map to manage lifecycle

**Step 3: Create renderer components**

- `usePreview` hook: manages preview state, start/stop dev server
- `PreviewToolbar`: URL bar (editable), refresh button, responsive size presets (mobile/tablet/desktop), external open button
- `PreviewPanel`: renders an iframe pointed at localhost:PORT, with toolbar on top. Size presets apply width constraints. Loading spinner while server starts.

**Step 4: Wire into ProjectDetail**

Add "Preview" tab to ProjectDetail. Only enabled when project has a dev script in package.json.

---

### Task 4: Design Token Studio

Visual editor for Tailwind config / design tokens — colors, spacing, typography.

**Files:**
- Create: `renderer/components/tokens/TokenStudio.tsx`
- Create: `renderer/components/tokens/ColorPalette.tsx`
- Create: `renderer/components/tokens/SpacingScale.tsx`
- Create: `renderer/components/tokens/TypographyPreview.tsx`
- Create: `renderer/hooks/useTokenStudio.ts`
- Modify: `shared/types.ts` — add `DesignTokens` type
- Modify: `renderer/components/project/ProjectDetail.tsx` — add Tokens tab

**Step 1: Define types**

```typescript
export interface DesignTokens {
  colors: Record<string, string | Record<string, string>>;
  spacing: Record<string, string>;
  fontFamily: Record<string, string[]>;
  fontSize: Record<string, [string, { lineHeight: string }]>;
  borderRadius: Record<string, string>;
}
```

**Step 2: Create `useTokenStudio` hook**

- Reads tailwind.config.js (or .ts) from project path via `window.api.readFile`
- Parses the `theme.extend` section (best-effort regex/JSON extraction)
- Provides getter/setter for each token category
- Save writes back to tailwind.config.js

**Step 3: Create visual components**

- `ColorPalette`: grid of color swatches with hex labels, click to edit (native color picker via input[type=color])
- `SpacingScale`: visual scale bars showing 4px, 8px, 16px etc. proportionally
- `TypographyPreview`: live text samples at each font size with font family labels
- `TokenStudio`: tabs for Colors, Spacing, Typography, Borders — each renders its visual component

**Step 4: Wire into ProjectDetail**

Add "Tokens" tab. Only enabled when project has tailwind.config.js.

---

## Batch 2: Intelligence & Collaboration (Tasks 5–8)

---

### Task 5: Visual Diff — Before/After Screenshots

Capture screenshots of pages at each git commit for visual comparison.

**Files:**
- Create: `renderer/components/diff/VisualDiff.tsx`
- Create: `renderer/components/diff/ScreenshotSlider.tsx`
- Create: `renderer/hooks/useVisualDiff.ts`
- Create: `main/ipc/screenshots.ts`
- Modify: `shared/types.ts` — add types and IPC channels
- Modify: `main/background.ts` — register screenshot handlers
- Modify: `main/preload.ts` — expose screenshot API

**Step 1: Define types**

```typescript
export interface ScreenshotEntry {
  id: string;
  commitHash: string;
  commitMessage: string;
  timestamp: number;
  imagePath: string; // local file path to PNG
  url: string;
  viewport: { width: number; height: number };
}
```

Add IPC channels: `CAPTURE_SCREENSHOT`, `GET_SCREENSHOTS`, `DELETE_SCREENSHOT`.

**Step 2: Create `main/ipc/screenshots.ts`**

- Uses Electron's `webContents.capturePage()` on a hidden BrowserWindow
- Stores PNGs in `~/.claude/studio/screenshots/{project-id}/`
- `captureScreenshot(url, viewport)`: creates hidden window, navigates, waits for load, captures, saves
- `getScreenshots(projectId)`: reads all stored screenshots with metadata JSON
- Pairs with git commit info from the project's current HEAD

**Step 3: Create renderer components**

- `useVisualDiff` hook: loads screenshot pairs, manages selection
- `ScreenshotSlider`: two images side by side with a draggable divider (before/after slider)
- `VisualDiff` page: commit selector dropdown, screenshot grid, click to compare with slider

**Step 4: Wire into ProjectDetail**

Add "Visual Diff" tab. Show capture button when preview is active.

---

### Task 6: Session Replay

Timeline visualization of Claude's actions during a session.

**Files:**
- Create: `renderer/components/sessions/SessionReplay.tsx`
- Create: `renderer/components/sessions/TimelineEvent.tsx`
- Create: `renderer/hooks/useSessionReplay.ts`
- Create: `main/ipc/session-replay.ts`
- Modify: `shared/types.ts` — add types

**Step 1: Define types**

```typescript
export interface SessionAction {
  id: string;
  timestamp: number;
  type: 'file_create' | 'file_edit' | 'file_delete' | 'command' | 'commit' | 'error';
  description: string;
  filePath?: string;
  diff?: string;
}

export interface SessionTimeline {
  sessionId: string;
  projectPath: string;
  startTime: number;
  endTime: number;
  actions: SessionAction[];
}
```

**Step 2: Create `main/ipc/session-replay.ts`**

- Reads Claude's session JSONL files from `~/.claude/projects/{encoded-path}/`
- Parses tool_use entries to extract actions (Read, Write, Edit, Bash)
- Groups by session, sorts by timestamp
- Returns structured timeline

**Step 3: Create renderer components**

- `useSessionReplay` hook: loads timeline for a project, manages playback position
- `TimelineEvent`: compact row showing icon (file/terminal/git), timestamp, description, expandable diff
- `SessionReplay`: vertical timeline with events, filterable by type, scrollable with time markers

---

### Task 7: Component Gallery

Auto-detect React components in a project and display them as a browsable gallery.

**Files:**
- Create: `renderer/components/gallery/ComponentGallery.tsx`
- Create: `renderer/components/gallery/ComponentCard.tsx`
- Create: `renderer/hooks/useComponentGallery.ts`
- Create: `main/ipc/components.ts`
- Modify: `shared/types.ts` — add types

**Step 1: Define types**

```typescript
export interface ComponentInfo {
  name: string;
  filePath: string;
  exportType: 'default' | 'named';
  props: { name: string; type: string; required: boolean }[];
  lineCount: number;
  hasTests: boolean;
}
```

**Step 2: Create `main/ipc/components.ts`**

- Scans project for `.tsx` / `.jsx` files (excluding node_modules, .next)
- Uses regex to detect `export default function ComponentName` and `export function ComponentName`
- Extracts prop types from TypeScript interfaces (best-effort regex)
- Checks for corresponding `.test.tsx` or `.spec.tsx` files
- Returns sorted list of ComponentInfo

**Step 3: Create renderer components**

- `useComponentGallery` hook: fetches component list, search/filter
- `ComponentCard`: component name, file path, prop count badge, test coverage indicator, click to open file
- `ComponentGallery`: search bar, grid of ComponentCards, group by directory

---

### Task 8: Multi-Project Workspace (Client Boards)

Board view for organizing projects into client workspaces.

**Files:**
- Create: `renderer/components/workspace/WorkspaceBoard.tsx`
- Create: `renderer/components/workspace/WorkspaceCard.tsx`
- Create: `renderer/hooks/useWorkspaces.ts`
- Create: `main/ipc/workspaces.ts`
- Modify: `shared/types.ts` — add types
- Modify: `renderer/pages/home.tsx` — add workspace page
- Modify: `renderer/components/layout/Sidebar.tsx` — add Workspaces nav

**Step 1: Define types**

```typescript
export interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string;
  projectPaths: string[];
  createdAt: number;
}
```

**Step 2: Create `main/ipc/workspaces.ts`**

Store in `~/.claude/studio/workspaces.json`.
CRUD operations: list, create, update, delete, addProject, removeProject.

**Step 3: Create renderer components**

- `useWorkspaces` hook: CRUD, drag-and-drop project assignment
- `WorkspaceBoard`: columns or cards per workspace, each showing its projects
- `WorkspaceCard`: workspace name, color dot, project count, list of project names
- Unassigned projects shown in a separate section

---

## Batch 3: Ship & Share (Tasks 9–12)

---

### Task 9: Figma Bridge

Connect to Figma via URL pasting and display design context alongside code.

**Files:**
- Create: `renderer/components/figma/FigmaBridge.tsx`
- Create: `renderer/components/figma/FigmaPreview.tsx`
- Create: `renderer/hooks/useFigmaBridge.ts`
- Create: `main/ipc/figma.ts`
- Modify: `shared/types.ts` — add types

**Step 1: Define types**

```typescript
export interface FigmaLink {
  id: string;
  projectPath: string;
  figmaUrl: string;
  nodeId: string;
  fileKey: string;
  label: string;
  createdAt: number;
}
```

**Step 2: Create `main/ipc/figma.ts`**

- Store links in `~/.claude/studio/figma-links/{project-id}.json`
- Parse Figma URLs to extract fileKey and nodeId
- CRUD for links per project

**Step 3: Create renderer components**

- `useFigmaBridge` hook: manages links, URL parsing
- `FigmaBridge`: list of linked Figma frames, "Add link" with URL input
- `FigmaPreview`: displays the Figma URL in an iframe (Figma embed) with link to open in Figma

**Step 4: Wire into ProjectDetail**

Add "Design" tab showing linked Figma frames for the project.

---

### Task 10: One-Click Deploy

Integration with Vercel/Netlify for deployment from the app.

**Files:**
- Create: `renderer/components/deploy/DeployPanel.tsx`
- Create: `renderer/components/deploy/DeployStatus.tsx`
- Create: `renderer/hooks/useDeploy.ts`
- Create: `main/ipc/deploy.ts`
- Modify: `shared/types.ts` — add types

**Step 1: Define types**

```typescript
export interface DeployConfig {
  provider: 'vercel' | 'netlify' | 'manual';
  projectId?: string;
  lastDeployUrl?: string;
  lastDeployTime?: number;
}

export interface DeployResult {
  success: boolean;
  url?: string;
  error?: string;
  timestamp: number;
}
```

**Step 2: Create `main/ipc/deploy.ts`**

- Detects if project has `vercel.json` or `.vercel/` directory
- Detects if project has `netlify.toml` or `.netlify/`
- `deploy(projectPath)`: runs `vercel --prod` or `netlify deploy --prod` via child_process
- Streams output back to renderer
- Stores deploy history in `~/.claude/studio/deploys/{project-id}.json`

**Step 3: Create renderer components**

- `useDeploy` hook: deploy trigger, status polling, history
- `DeployPanel`: provider auto-detect, deploy button, output log, link to deployed URL
- `DeployStatus`: latest deploy info (status, URL, time) shown on ProjectCard

---

### Task 11: Cost & Usage Tracker

Monitor Claude API usage and estimated costs per project.

**Files:**
- Create: `renderer/components/usage/UsageTracker.tsx`
- Create: `renderer/components/usage/UsageChart.tsx`
- Create: `renderer/hooks/useUsageTracker.ts`
- Create: `main/ipc/usage.ts`
- Modify: `shared/types.ts` — add types

**Step 1: Define types**

```typescript
export interface UsageEntry {
  date: string; // YYYY-MM-DD
  projectPath: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  sessionCount: number;
}
```

**Step 2: Create `main/ipc/usage.ts`**

- Reads Claude's session JSONL files to extract token usage from API responses
- Aggregates by day and project
- Calculates estimated cost based on model pricing
- Stores aggregated data in `~/.claude/studio/usage/`

**Step 3: Create renderer components**

- `useUsageTracker` hook: loads usage data, date range filter
- `UsageChart`: simple bar chart rendered with CSS (no chart library) — bars for daily usage
- `UsageTracker`: date range picker, per-project breakdown, total cost estimate, chart visualization

---

### Task 12: Handoff Export

Generate a shareable package with project context for handoff to clients or team members.

**Files:**
- Create: `renderer/components/handoff/HandoffExport.tsx`
- Create: `renderer/hooks/useHandoff.ts`
- Create: `main/ipc/handoff.ts`
- Modify: `shared/types.ts` — add types

**Step 1: Define types**

```typescript
export interface HandoffPackage {
  projectName: string;
  generatedAt: number;
  sections: {
    overview: string; // from CLAUDE.md
    plan: string | null; // from PLAN.md
    gitSummary: string; // branch, last commits
    tasks: TaskItem[];
    fileTree: string; // directory structure
    techStack: string[]; // from package.json
  };
}
```

**Step 2: Create `main/ipc/handoff.ts`**

- `generateHandoff(projectPath)`: assembles all project context into HandoffPackage
- `exportHandoff(projectPath, format)`: exports as markdown file or HTML
- Generates clean markdown document with all sections
- Saves to `{projectPath}/HANDOFF.md` or opens save dialog

**Step 3: Create renderer components**

- `useHandoff` hook: generate, preview, export actions
- `HandoffExport`: preview pane showing the generated handoff document, export buttons (Markdown/HTML), section toggles to include/exclude

---

## Implementation Order

1. **Task 1** (CLAUDE.md Editor) — foundation file I/O that other features need
2. **Task 2** (Prompt Library) — standalone, high value
3. **Task 4** (Token Studio) — standalone, high designer appeal
4. **Task 3** (Preview Panel) — needs dev server management
5. **Task 8** (Workspaces) — organizational, standalone
6. **Task 6** (Session Replay) — reads existing data, standalone
7. **Task 7** (Component Gallery) — file scanning, standalone
8. **Task 5** (Visual Diff) — depends on preview infrastructure
9. **Task 9** (Figma Bridge) — external integration
10. **Task 12** (Handoff Export) — aggregates existing data
11. **Task 10** (Deploy) — external CLI integration
12. **Task 11** (Usage Tracker) — JSONL parsing, standalone

---

## Navigation Update

After all tasks, the Sidebar should have:
- Dashboard (existing)
- Workspaces (new)
- Prompts (new)
- Settings (existing)

And ProjectDetail should have tabs:
- Overview (existing)
- Tasks (existing)
- Team (existing)
- Sessions (existing)
- Preview (new)
- Design (new — Figma)
- Tokens (new)
- Components (new)
- Visual Diff (new)
- CLAUDE.md (existing, now with edit mode)
- Deploy (new)
- Usage (new)
- Handoff (new)
