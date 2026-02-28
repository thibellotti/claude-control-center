# Dirigir MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Claude Control Center into Dirigir — a designer-operated web app builder powered by Claude, with Request system, Annotated Preview, Design Replay, and translated Activity Feed.

**Architecture:** Incremental transformation of the existing Electron + Next.js (Nextron) app. New features are layered on top of existing infrastructure: live feed becomes translated activity, preview workspace becomes annotated canvas, visual diff becomes Design Replay. A new Request system bridges natural language → Claude Code CLI sessions via node-pty.

**Tech Stack:** Electron 34, Next.js 14, React 18, Tailwind CSS, node-pty, xterm.js, simple-git, react-resizable-panels. New: Stripe (billing), next-auth or custom JWT (accounts).

---

## Phase 1: Request System (Core Product)

### Task 1: Add Request types to shared/types.ts

**Files:**
- Modify: `shared/types.ts`

**Step 1:** Add the following types at the end of `shared/types.ts`:

```typescript
// -- Dirigir Request System --

export type RequestStatus = 'draft' | 'queued' | 'in_progress' | 'review' | 'approved' | 'rejected';

export interface RequestAttachment {
  id: string;
  type: 'figma' | 'screenshot' | 'reference_url';
  url: string;
  label: string;
  thumbnail?: string;
}

export interface DesignRequest {
  id: string;
  projectId: string;
  projectPath: string;
  prompt: string;
  attachments: RequestAttachment[];
  status: RequestStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  screenshotBefore?: string;
  screenshotAfter?: string;
  error?: string;
}

export interface TranslatedFeedEntry {
  timestamp: number;
  type: 'info' | 'action' | 'progress' | 'complete' | 'error';
  message: string;
  detail?: string;
  requestId: string;
}
```

**Step 2:** Add IPC channel constants for the request system in the `IPC_CHANNELS` object:

```typescript
// Request System
CREATE_REQUEST: 'create-request',
GET_REQUESTS: 'get-requests',
CANCEL_REQUEST: 'cancel-request',
APPROVE_REQUEST: 'approve-request',
REJECT_REQUEST: 'reject-request',
REQUEST_STATUS_UPDATE: 'request-status-update',
REQUEST_FEED_UPDATE: 'request-feed-update',
```

**Step 3:** Verify: `npx tsc --noEmit` passes.

**Step 4:** Commit: `git add shared/types.ts && git commit -m "feat: add Dirigir request system types and IPC channels"`

---

### Task 2: Create Request IPC handler (main process)

**Files:**
- Create: `main/ipc/requests.ts`
- Modify: `main/background.ts` (register handler)
- Modify: `main/preload.ts` (expose to renderer)

**Step 1:** Create `main/ipc/requests.ts`:

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { IPC_CHANNELS, DesignRequest, RequestStatus } from '../../shared/types';
import { log } from '../helpers/logger';

const HOME = os.homedir();
const REQUESTS_DIR = path.join(HOME, '.claude', 'studio', 'requests');

// In-memory request store (persisted to disk)
let requests: DesignRequest[] = [];

// Active Claude Code PTY session per request
const activeProcesses = new Map<string, ReturnType<typeof require('node-pty').spawn>>();

const pty = require('node-pty');

async function ensureDir() {
  await fs.mkdir(REQUESTS_DIR, { recursive: true });
}

async function loadRequests(): Promise<DesignRequest[]> {
  await ensureDir();
  try {
    const data = await fs.readFile(path.join(REQUESTS_DIR, 'requests.json'), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveRequests() {
  await ensureDir();
  await fs.writeFile(
    path.join(REQUESTS_DIR, 'requests.json'),
    JSON.stringify(requests, null, 2),
    'utf-8'
  );
}

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

function pushUpdate(channel: string, data: unknown) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

function translateToolUse(summary: string): string {
  // Convert Claude Code tool summaries to designer-friendly language
  if (summary.startsWith('Edit:') || summary.startsWith('Write:')) {
    const file = summary.split(':').slice(1).join(':').trim();
    const name = file.split('/').pop() || file;
    const ext = name.split('.').pop();
    if (ext === 'tsx' || ext === 'jsx') return `Updating ${name.replace(`.${ext}`, '')} component`;
    if (ext === 'css' || ext === 'scss') return `Updating styles`;
    if (ext === 'ts' || ext === 'js') return `Updating ${name.replace(`.${ext}`, '')}`;
    return `Editing ${name}`;
  }
  if (summary.startsWith('Read:')) {
    const file = summary.split(':').slice(1).join(':').trim().split('/').pop() || '';
    if (file.includes('tailwind')) return 'Checking design tokens';
    if (file.includes('package')) return 'Checking project configuration';
    return `Reading ${file}`;
  }
  if (summary.startsWith('Bash:')) {
    const cmd = summary.slice(5).trim();
    if (cmd.startsWith('npm install') || cmd.startsWith('yarn add')) return 'Installing dependency';
    if (cmd.startsWith('npm run build')) return 'Building project';
    if (cmd.startsWith('npm run')) return 'Running project script';
    return 'Running command';
  }
  if (summary.startsWith('Glob:') || summary.startsWith('Grep:')) return 'Scanning project files';
  return summary;
}

async function executeRequest(request: DesignRequest) {
  request.status = 'in_progress';
  request.startedAt = Date.now();
  pushUpdate(IPC_CHANNELS.REQUEST_STATUS_UPDATE, request);
  await saveRequests();

  const shell = process.env.SHELL || '/bin/zsh';

  // Build the Claude command with the request prompt
  const escapedPrompt = request.prompt.replace(/'/g, "'\\''");
  const command = `cd '${request.projectPath}' && claude --print '${escapedPrompt}'`;

  const proc = pty.spawn(shell, ['-c', command], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: request.projectPath,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
    },
  });

  activeProcesses.set(request.id, proc);

  let output = '';

  proc.onData((data: string) => {
    output += data;
    // Send translated feed updates
    const lines = data.split('\n').filter(Boolean);
    for (const line of lines) {
      const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
      if (clean.length > 0 && !clean.startsWith('╭') && !clean.startsWith('│') && !clean.startsWith('╰')) {
        const translated = translateToolUse(clean);
        pushUpdate(IPC_CHANNELS.REQUEST_FEED_UPDATE, {
          timestamp: Date.now(),
          type: 'action',
          message: translated,
          detail: clean,
          requestId: request.id,
        });
      }
    }
  });

  proc.onExit(async ({ exitCode }: { exitCode: number }) => {
    activeProcesses.delete(request.id);
    request.status = exitCode === 0 ? 'review' : 'review';
    request.completedAt = Date.now();
    if (exitCode !== 0) {
      request.error = `Claude exited with code ${exitCode}`;
    }
    pushUpdate(IPC_CHANNELS.REQUEST_STATUS_UPDATE, request);
    await saveRequests();
  });
}

export function registerRequestHandlers() {
  // Load persisted requests on startup
  loadRequests().then((loaded) => { requests = loaded; });

  ipcMain.handle(IPC_CHANNELS.CREATE_REQUEST, async (_, data: {
    projectId: string;
    projectPath: string;
    prompt: string;
    attachments?: DesignRequest['attachments'];
  }) => {
    const request: DesignRequest = {
      id: uuidv4(),
      projectId: data.projectId,
      projectPath: data.projectPath,
      prompt: data.prompt,
      attachments: data.attachments || [],
      status: 'queued',
      createdAt: Date.now(),
    };
    requests.unshift(request);
    await saveRequests();

    // Auto-execute (queue of 1 for MVP)
    executeRequest(request);

    return request;
  });

  ipcMain.handle(IPC_CHANNELS.GET_REQUESTS, async (_, projectId?: string) => {
    if (projectId) {
      return requests.filter((r) => r.projectId === projectId);
    }
    return requests;
  });

  ipcMain.handle(IPC_CHANNELS.CANCEL_REQUEST, async (_, requestId: string) => {
    const proc = activeProcesses.get(requestId);
    if (proc) {
      proc.kill();
      activeProcesses.delete(requestId);
    }
    const request = requests.find((r) => r.id === requestId);
    if (request) {
      request.status = 'rejected';
      request.completedAt = Date.now();
      await saveRequests();
    }
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.APPROVE_REQUEST, async (_, requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (request) {
      request.status = 'approved';
      await saveRequests();
    }
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.REJECT_REQUEST, async (_, requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (request) {
      request.status = 'rejected';
      // TODO: In future, trigger git revert to undo changes
      await saveRequests();
    }
    return true;
  });
}
```

**Step 2:** Add `uuid` dependency:

```bash
npm install uuid && npm install -D @types/uuid
```

**Step 3:** Register in `main/background.ts` — add import and call `registerRequestHandlers()` alongside other handlers.

**Step 4:** Expose in `main/preload.ts` — add to the `api` object:

```typescript
createRequest: (data: { projectId: string; projectPath: string; prompt: string; attachments?: unknown[] }) =>
  ipcRenderer.invoke(IPC_CHANNELS.CREATE_REQUEST, data),
getRequests: (projectId?: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_REQUESTS, projectId),
cancelRequest: (requestId: string) => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_REQUEST, requestId),
approveRequest: (requestId: string) => ipcRenderer.invoke(IPC_CHANNELS.APPROVE_REQUEST, requestId),
rejectRequest: (requestId: string) => ipcRenderer.invoke(IPC_CHANNELS.REJECT_REQUEST, requestId),
onRequestStatusUpdate: (callback: (request: unknown) => void) => {
  const handler = (_: unknown, data: unknown) => callback(data);
  ipcRenderer.on(IPC_CHANNELS.REQUEST_STATUS_UPDATE, handler);
  return () => { ipcRenderer.removeListener(IPC_CHANNELS.REQUEST_STATUS_UPDATE, handler); };
},
onRequestFeedUpdate: (callback: (entry: unknown) => void) => {
  const handler = (_: unknown, data: unknown) => callback(data);
  ipcRenderer.on(IPC_CHANNELS.REQUEST_FEED_UPDATE, handler);
  return () => { ipcRenderer.removeListener(IPC_CHANNELS.REQUEST_FEED_UPDATE, handler); };
},
```

**Step 5:** Verify: `npm run build` passes.

**Step 6:** Commit: `git add -A && git commit -m "feat: add request system IPC handler with Claude Code bridge"`

---

### Task 3: Create useRequests hook

**Files:**
- Create: `renderer/hooks/useRequests.ts`

**Step 1:** Create `renderer/hooks/useRequests.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { DesignRequest, TranslatedFeedEntry } from '../../shared/types';

export function useRequests(projectId?: string) {
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [feedEntries, setFeedEntries] = useState<TranslatedFeedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load requests
  useEffect(() => {
    async function load() {
      const data = await window.api.getRequests(projectId);
      setRequests(data as DesignRequest[]);
      setIsLoading(false);
    }
    load();
  }, [projectId]);

  // Listen for status updates
  useEffect(() => {
    const unsub = window.api.onRequestStatusUpdate((request: unknown) => {
      const updated = request as DesignRequest;
      setRequests((prev) => {
        const idx = prev.findIndex((r) => r.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [updated, ...prev];
      });
    });
    return unsub;
  }, []);

  // Listen for feed updates
  useEffect(() => {
    const unsub = window.api.onRequestFeedUpdate((entry: unknown) => {
      const feedEntry = entry as TranslatedFeedEntry;
      setFeedEntries((prev) => [...prev, feedEntry].slice(-200));
    });
    return unsub;
  }, []);

  const createRequest = useCallback(
    async (prompt: string, projectPath: string, attachments?: DesignRequest['attachments']) => {
      const request = await window.api.createRequest({
        projectId: projectId || '',
        projectPath,
        prompt,
        attachments,
      });
      return request as DesignRequest;
    },
    [projectId]
  );

  const approveRequest = useCallback(async (requestId: string) => {
    await window.api.approveRequest(requestId);
  }, []);

  const rejectRequest = useCallback(async (requestId: string) => {
    await window.api.rejectRequest(requestId);
  }, []);

  const cancelRequest = useCallback(async (requestId: string) => {
    await window.api.cancelRequest(requestId);
  }, []);

  const clearFeed = useCallback(() => {
    setFeedEntries([]);
  }, []);

  const activeRequest = requests.find((r) => r.status === 'in_progress');
  const pendingReview = requests.filter((r) => r.status === 'review');

  return {
    requests,
    feedEntries,
    isLoading,
    activeRequest,
    pendingReview,
    createRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
    clearFeed,
  };
}
```

**Step 2:** Verify: `npx tsc --noEmit` passes.

**Step 3:** Commit: `git add renderer/hooks/useRequests.ts && git commit -m "feat: add useRequests hook for request system state management"`

---

### Task 4: Create RequestBar component (Cmd+K input)

**Files:**
- Create: `renderer/components/dirigir/RequestBar.tsx`

**Step 1:** Create the floating request input bar — this is the primary interaction point for designers. Opens with `Cmd+K`, has text input, Figma link attachment, and submit button. Uses the existing `useFocusTrap` hook for accessibility.

The component should:
- Float at the bottom center of the canvas area
- Have a text input with placeholder "Describe what you want to change..."
- Show attachment chips (Figma link, reference URL)
- Have a submit button that calls `createRequest()`
- Show the active request status inline when one is running
- Keyboard shortcut: `Cmd+K` to toggle open/close

Design: dark floating bar, rounded-card, blurred backdrop, accent border when focused. Match the existing design token system.

**Step 2:** Verify: renders correctly with `npm run dev`, typing and submitting works.

**Step 3:** Commit.

---

### Task 5: Create RequestQueue component

**Files:**
- Create: `renderer/components/dirigir/RequestQueue.tsx`

**Step 1:** Create the sidebar panel that shows all requests for the current project as visual cards. Each card shows: prompt text (truncated), status badge, timestamp, and approve/reject buttons for requests in "review" status.

Cards are ordered newest-first. Status colors: queued=surface-3, in_progress=accent with pulse, review=feedback-warning, approved=feedback-success, rejected=feedback-error.

**Step 2:** Verify: shows request cards after creating via RequestBar.

**Step 3:** Commit.

---

### Task 6: Create TranslatedActivityFeed component

**Files:**
- Create: `renderer/components/dirigir/TranslatedFeed.tsx`

**Step 1:** Create the designer-friendly activity feed that replaces the raw LiveFeed for the Dirigir canvas view. Shows translated messages from `useRequests().feedEntries`.

Each entry shows: translated message (large, primary text), timestamp (micro, tertiary), and an expandable detail row (monospace, the raw tool call for debugging).

Auto-scrolls to bottom. Has a progress bar at top when a request is active.

**Step 2:** Verify: feed updates in real time when a request is executing.

**Step 3:** Commit.

---

## Phase 2: Canvas Layout Transformation

### Task 7: Create DirigirCanvas layout component

**Files:**
- Create: `renderer/components/dirigir/DirigirCanvas.tsx`

**Step 1:** Create the main canvas layout that replaces ProjectWorkspace when in "Dirigir mode". Three-column layout:

- Left panel (240px): Project pages (routes auto-detected from file system), RequestQueue
- Center panel (flex-1): Live preview iframe (reuses PreviewPanel) with annotation overlay
- Right panel (280px): TranslatedFeed, design token summary

Top bar: project name, viewport selector (desktop/tablet/mobile buttons), Design Replay slider (placeholder for now).

Bottom: RequestBar floating input.

Uses `react-resizable-panels` (already installed) for the three columns.

**Step 2:** Verify: layout renders correctly with all three panels.

**Step 3:** Commit.

---

### Task 8: Create PagesList component (route detection)

**Files:**
- Create: `renderer/components/dirigir/PagesList.tsx`
- Create: `main/ipc/pages.ts` (IPC handler to detect routes)

**Step 1:** Create an IPC handler that scans a Next.js/React project for page routes:
- For Next.js: scan `pages/` or `app/` directory for `.tsx`/`.jsx` files
- For React Router: scan for `<Route>` patterns in source files
- Returns: `{ path: string; label: string; filePath: string }[]`

**Step 2:** Create the PagesList component that displays routes as visual cards in the left sidebar. Clicking a page navigates the preview iframe to that route.

**Step 3:** Verify: pages detected and displayed for a Next.js project.

**Step 4:** Commit.

---

### Task 9: Wire DirigirCanvas into AppLayout

**Files:**
- Modify: `renderer/components/layout/AppLayout.tsx`
- Modify: `renderer/pages/home.tsx`

**Step 1:** When a project is selected, render `DirigirCanvas` instead of the current `ProjectWorkspace + PreviewWorkspace` split. Keep the old layout accessible via a "Developer Mode" toggle in Settings for backward compatibility.

**Step 2:** Verify: selecting a project shows the new Dirigir canvas layout.

**Step 3:** Commit.

---

## Phase 3: Annotated Preview

### Task 10: Create AnnotationOverlay component

**Files:**
- Create: `renderer/components/dirigir/AnnotationOverlay.tsx`
- Create: `renderer/hooks/useAnnotations.ts`

**Step 1:** Create the annotation system. The AnnotationOverlay sits on top of the preview iframe and:
- Detects mouse hover → highlights the hovered element with a blue outline (uses `postMessage` to inject a small script into the iframe that returns element bounds)
- On click → creates an annotation bubble at that position
- Annotation bubble: text input + "Attach Figma link" button + delete button
- Multiple annotations accumulate → "Submit all as request" button appears

**Step 2:** Create `useAnnotations` hook that manages annotation state: `{ id, x, y, text, elementSelector, figmaLink? }[]`.

**Step 3:** Verify: can click on preview elements, type annotations, and submit as a batch request.

**Step 4:** Commit.

---

## Phase 4: Design Replay

### Task 11: Create auto-screenshot capture on request completion

**Files:**
- Modify: `main/ipc/requests.ts` (add screenshot capture after request completes)

**Step 1:** When a request transitions to "review" status, automatically capture a screenshot of the current preview URL. Store the screenshot path on the request object (`screenshotAfter`). Also capture `screenshotBefore` when the request starts.

Reuse the existing `captureScreenshot` infrastructure from the visual diff system.

**Step 2:** Verify: screenshots are captured automatically when requests complete.

**Step 3:** Commit.

---

### Task 12: Create DesignReplaySlider component

**Files:**
- Create: `renderer/components/dirigir/DesignReplaySlider.tsx`

**Step 1:** Create a timeline slider that sits at the top of the canvas. Each completed request creates a dot on the timeline. Dragging the slider shows the screenshot from that point in time.

The slider shows: dots for each request, labels on hover (request prompt truncated), current position indicator. Clicking a dot shows the before/after screenshots in a ScreenshotSlider (reuse existing component).

**Step 2:** Verify: slider shows dots for completed requests, clicking shows screenshots.

**Step 3:** Commit.

---

## Phase 5: Sidebar Transformation

### Task 13: Create DirigirSidebar

**Files:**
- Create: `renderer/components/dirigir/DirigirSidebar.tsx`

**Step 1:** Create a new sidebar designed for designers. Navigation items:
- **Projects** (top) — project selector dropdown
- **Pages** — routes in the current project (PagesList)
- **Requests** — request queue with status badges
- **History** — Design Replay list view (completed requests as timeline)
- **Deploy** (bottom) — one-click deploy button with status indicator
- **Settings** (bottom) — gear icon

No "Terminal", "Prompts", "Usage", "Workspaces" in the designer sidebar. These move to a "Developer Mode" toggle in Settings.

**Step 2:** Verify: sidebar renders with correct navigation.

**Step 3:** Commit.

---

## Phase 6: Onboarding

### Task 14: Create OnboardingWizard component

**Files:**
- Create: `renderer/components/dirigir/OnboardingWizard.tsx`
- Create: `renderer/hooks/useOnboarding.ts`

**Step 1:** Create a multi-step onboarding wizard shown on first launch:

1. Welcome screen — "Dirigir lets you build web apps visually with AI"
2. API Key — input field for Anthropic API key, stored in Electron secure storage
3. First Project — "New from template" or "Open existing folder" (folder picker dialog)
4. Quick Tour — animated highlights of RequestBar, Preview, Activity Feed

Store onboarding completion state in `~/.claude/studio/dirigir-config.json`.

**Step 2:** Wire into `home.tsx` — show wizard before main UI if onboarding not completed.

**Step 3:** Verify: wizard appears on first launch, can complete all steps.

**Step 4:** Commit.

---

### Task 15: Create project templates

**Files:**
- Create: `renderer/components/dirigir/TemplateSelector.tsx`
- Create: `main/ipc/templates.ts`

**Step 1:** Create 3 project templates that Claude scaffolds:
- **Landing Page** — single page with hero, features, pricing, footer
- **Dashboard** — auth page + sidebar layout + 3 empty dashboard pages
- **Blank** — minimal Next.js + Tailwind setup

When designer selects a template, the app:
1. Creates a new directory in `~/Projects/`
2. Spawns Claude Code with a scaffolding prompt specific to the template
3. Shows live progress in the activity feed
4. When done, opens the project in the Dirigir canvas

**Step 2:** Verify: can create a new project from template, Claude scaffolds it.

**Step 3:** Commit.

---

## Phase 7: Polish & Deploy

### Task 16: Update app branding

**Files:**
- Modify: `electron-builder.yml` (app name, icons)
- Modify: `renderer/styles/globals.css` (any brand color adjustments)
- Create: `resources/icon.png` (new app icon)

**Step 1:** Update app name to "Dirigir" in electron-builder config. Update the sidebar header text. Create or source a new app icon that represents visual direction/control (a cursor or compass motif).

**Step 2:** Verify: app builds with new name and icon.

**Step 3:** Commit.

---

### Task 17: Add viewport selector to canvas

**Files:**
- Create: `renderer/components/dirigir/ViewportSelector.tsx`

**Step 1:** Three buttons in the canvas top bar: Desktop (1280px), Tablet (768px), Mobile (375px). Clicking resizes the preview iframe width with a smooth transition. Current viewport is highlighted with accent color.

**Step 2:** Verify: preview resizes correctly for each viewport.

**Step 3:** Commit.

---

### Task 18: One-click deploy integration

**Files:**
- Modify: `renderer/components/dirigir/DirigirSidebar.tsx` (add deploy button)
- Create: `renderer/components/dirigir/DeployButton.tsx`

**Step 1:** A prominent deploy button in the sidebar footer. Shows provider icon (Vercel/Netlify auto-detected). One click deploys. Shows inline progress states: "Deploying..." → "Live at url" with copy button. Reuses existing deploy IPC handlers.

**Step 2:** Verify: can deploy a project with one click from the sidebar.

**Step 3:** Commit.

---

## Phase 8: Account System (can be deferred post-launch)

### Task 19: Add Stripe billing and account system

**Files:**
- Create: `main/ipc/account.ts`
- Create: `renderer/components/dirigir/AccountPage.tsx`
- Create: `renderer/hooks/useAccount.ts`

**Step 1:** This task sets up the account/billing infrastructure:
- Local account config stored in `~/.claude/studio/account.json`
- Stripe Checkout integration for subscription management
- Feature gating based on plan tier (free: 1 project, pro: unlimited)
- Settings page for managing API key and subscription

Note: For MVP launch, this can be simplified to a license key system checked against a simple API endpoint, avoiding full auth infrastructure.

**Step 2:** Verify: can create account, subscribe, feature gating works.

**Step 3:** Commit.

---

## Summary

| Phase | Tasks | Impact | Effort |
|-------|-------|--------|--------|
| 1 — Request System | Tasks 1-6 | Critical (IS the product) | High |
| 2 — Canvas Layout | Tasks 7-9 | Critical (main UX) | Medium |
| 3 — Annotated Preview | Task 10 | High (designer interaction) | Medium |
| 4 — Design Replay | Tasks 11-12 | High (time machine) | Medium |
| 5 — Sidebar | Task 13 | Medium (navigation) | Low |
| 6 — Onboarding | Tasks 14-15 | Medium (first-run) | Medium |
| 7 — Polish | Tasks 16-18 | Medium (branding + UX) | Low |
| 8 — Billing | Task 19 | Low (post-launch OK) | High |

**Recommended execution order:** Phases 1-2 first (makes the app functional), then 3-5 (makes it designer-friendly), then 6-7 (makes it launchable), then 8 (monetization).

**Total: 19 tasks across 8 phases.**
