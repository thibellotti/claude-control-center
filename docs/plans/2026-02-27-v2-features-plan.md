# Control Center v2 Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 8 major features to the Claude Control Center: theme system, toast notifications, app icon, smart refresh, project health indicators, real-time session monitoring, quick actions enhancement, and distribution setup.

**Architecture:** Features are grouped into 4 batches. Batch 1 builds foundational UI systems (theme, toasts, icon). Batch 2 adds backend intelligence (smart refresh, health data, session detection). Batch 3 wires backend data into UI components. Batch 4 handles distribution (code signing, GitHub).

**Tech Stack:** Electron 34, Next.js 14, React 18, TailwindCSS 3.4, chokidar 3, simple-git, electron-store 8

---

## Batch 1 — Foundation

### Task 1: Theme System (Dark/Light Mode)

Convert hardcoded dark colors to CSS custom properties with dark/light variants. Add theme context, persist preference, detect system preference.

**Files:**
- Modify: `renderer/styles/globals.css`
- Modify: `renderer/tailwind.config.js`
- Create: `renderer/hooks/useTheme.ts`
- Modify: `renderer/pages/_app.tsx`
- Modify: `renderer/pages/home.tsx`
- Modify: `renderer/components/settings/SettingsPage.tsx`
- Modify: `main/preload.ts`
- Modify: `main/ipc/settings.ts`
- Modify: `shared/types.ts`

**Step 1: Add CSS custom properties for both themes**

In `renderer/styles/globals.css`, add root-level CSS variables for both themes:

```css
/* Add BEFORE the @tailwind directives */
:root {
  /* Light theme (default) */
  --surface-0: #FFFFFF;
  --surface-1: #F8F8F8;
  --surface-2: #F0F0F0;
  --surface-3: #E8E8E8;
  --surface-4: #E0E0E0;
  --border-subtle: #E5E5E5;
  --border-default: #D4D4D4;
  --border-strong: #A3A3A3;
  --text-primary: #171717;
  --text-secondary: #525252;
  --text-tertiary: #A3A3A3;
  --accent: #3B82F6;
  --accent-hover: #2563EB;
  --accent-muted: rgba(59, 130, 246, 0.1);
  --status-active: #22C55E;
  --status-idle: #9CA3AF;
  --status-dirty: #F59E0B;
  --status-clean: #22C55E;
}

.dark {
  --surface-0: #0A0A0A;
  --surface-1: #141414;
  --surface-2: #1A1A1A;
  --surface-3: #222222;
  --surface-4: #2A2A2A;
  --border-subtle: #262626;
  --border-default: #333333;
  --border-strong: #444444;
  --text-primary: #FAFAFA;
  --text-secondary: #A0A0A0;
  --text-tertiary: #666666;
  --accent: #3B82F6;
  --accent-hover: #2563EB;
  --accent-muted: rgba(59, 130, 246, 0.12);
  --status-active: #22C55E;
  --status-idle: #6B7280;
  --status-dirty: #F59E0B;
  --status-clean: #22C55E;
}
```

**Step 2: Update Tailwind config to use CSS variables**

Replace all hardcoded color values in `renderer/tailwind.config.js` with `var(--token-name)`:

```javascript
module.exports = {
  content: [
    './renderer/pages/**/*.{js,ts,jsx,tsx}',
    './renderer/components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          4: 'var(--surface-4)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
        },
        status: {
          active: 'var(--status-active)',
          idle: 'var(--status-idle)',
          dirty: 'var(--status-dirty)',
          clean: 'var(--status-clean)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      borderRadius: {
        card: '8px',
        button: '4px',
      },
    },
  },
  plugins: [],
};
```

**Step 3: Create useTheme hook**

Create `renderer/hooks/useTheme.ts`:

```typescript
import { useState, useEffect, useCallback, createContext, useContext } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'dark',
  setTheme: () => {},
});

export function useThemeProvider() {
  const [theme, setThemeState] = useState<Theme>('system');
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('dark');

  const resolvedTheme = theme === 'system' ? systemPreference : theme;

  // Detect system preference
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPreference(mql.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  // Load saved preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme') as Theme | null;
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        setThemeState(saved);
      }
    } catch {}
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
    } catch {}
  }, []);

  return { theme, resolvedTheme, setTheme };
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

**Step 4: Wire ThemeContext into _app.tsx**

Modify `renderer/pages/_app.tsx`:

```tsx
import React from 'react';
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { ThemeContext, useThemeProvider } from '../hooks/useTheme';

export default function MyApp({ Component, pageProps }: AppProps) {
  const themeValue = useThemeProvider();

  return (
    <ThemeContext.Provider value={themeValue}>
      <Component {...pageProps} />
    </ThemeContext.Provider>
  );
}
```

**Step 5: Add theme toggle to SettingsPage**

Add a "Theme" section to `renderer/components/settings/SettingsPage.tsx` at the top of the settings content:

```tsx
// Import useTheme at top
import { useTheme } from '../../hooks/useTheme';

// Inside the component, before the permissions section:
const { theme, setTheme } = useTheme();

// Add theme selector JSX:
<section>
  <h2 className="text-sm font-semibold text-text-primary mb-3">Appearance</h2>
  <div className="flex gap-2">
    {(['light', 'dark', 'system'] as const).map((option) => (
      <button
        key={option}
        onClick={() => setTheme(option)}
        className={`px-4 py-2 rounded-button text-sm capitalize transition-colors ${
          theme === option
            ? 'bg-accent text-white'
            : 'bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-surface-3'
        }`}
      >
        {option}
      </button>
    ))}
  </div>
</section>
```

**Step 6: Update background.ts backgroundColor**

Change the `backgroundColor` in `main/background.ts` to be flexible:
- Keep `backgroundColor: '#0A0A0A'` for now (initial flash is acceptable; CSS takes over immediately)

**Step 7: Verify**

Run `npm run dev`, open Settings, toggle between Light/Dark/System. All surfaces, text, borders, and accents should adapt. The macOS title bar area should match the theme. Test that preference persists across page refreshes.

**Step 8: Commit**

```bash
git add renderer/styles/globals.css renderer/tailwind.config.js renderer/hooks/useTheme.ts renderer/pages/_app.tsx renderer/components/settings/SettingsPage.tsx
git commit -m "feat: add dark/light/system theme toggle with CSS variables"
```

---

### Task 2: Toast Notification System

Create a lightweight toast component for showing brief status messages.

**Files:**
- Create: `renderer/components/shared/Toast.tsx`
- Create: `renderer/hooks/useToast.ts`
- Modify: `renderer/pages/_app.tsx`

**Step 1: Create toast store hook**

Create `renderer/hooks/useToast.ts`:

```typescript
import { useState, useCallback, createContext, useContext } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function useToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: Toast['type'] = 'info', duration = 3000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type, duration }]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return { toasts, addToast, removeToast };
}

export function useToast() {
  return useContext(ToastContext);
}
```

**Step 2: Create Toast component**

Create `renderer/components/shared/Toast.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';

const typeStyles = {
  info: 'bg-surface-3 border-border-default text-text-secondary',
  success: 'bg-surface-3 border-status-active text-status-active',
  warning: 'bg-surface-3 border-status-dirty text-status-dirty',
};

function ToastItem({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: 'info' | 'success' | 'warning';
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 rounded-card border text-sm font-medium shadow-lg backdrop-blur-sm transition-all duration-300 cursor-pointer ${
        typeStyles[type]
      } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      onClick={onDismiss}
      role="status"
      aria-live="polite"
    >
      {type === 'success' && <span>&#10003;</span>}
      {type === 'warning' && <span>&#9888;</span>}
      {type === 'info' && <span>&#8226;</span>}
      <span>{message}</span>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
```

**Step 3: Wire into _app.tsx**

Add ToastContext provider and ToastContainer to `renderer/pages/_app.tsx`:

```tsx
import React from 'react';
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { ThemeContext, useThemeProvider } from '../hooks/useTheme';
import { ToastContext, useToastProvider } from '../hooks/useToast';
import ToastContainer from '../components/shared/Toast';

export default function MyApp({ Component, pageProps }: AppProps) {
  const themeValue = useThemeProvider();
  const toastValue = useToastProvider();

  return (
    <ThemeContext.Provider value={themeValue}>
      <ToastContext.Provider value={toastValue}>
        <Component {...pageProps} />
        <ToastContainer />
      </ToastContext.Provider>
    </ThemeContext.Provider>
  );
}
```

**Step 4: Verify**

Run `npm run dev`. Temporarily add a test toast in home.tsx: `const { addToast } = useToast(); addToast('Test notification', 'success');` — verify it appears bottom-right and auto-dismisses. Remove the test code.

**Step 5: Commit**

```bash
git add renderer/hooks/useToast.ts renderer/components/shared/Toast.tsx renderer/pages/_app.tsx
git commit -m "feat: add toast notification system"
```

---

### Task 3: App Icon

Generate a custom app icon for the macOS dock and window title bar.

**Files:**
- Create: `resources/icon.svg` (source SVG)
- Modify: `resources/icon.icns` (generated macOS icon)
- Modify: `electron-builder.yml`

**Step 1: Create SVG icon source**

Create `resources/icon.svg` — a minimalist "CC" mark inside a rounded square. Design: dark background with a subtle gradient, "CC" in clean sans-serif with an accent blue dot.

```svg
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="228" fill="url(#bg)"/>
  <text x="512" y="580" font-family="Inter, SF Pro Display, -apple-system, sans-serif" font-size="420" font-weight="700" fill="#FAFAFA" text-anchor="middle" dominant-baseline="central" letter-spacing="-20">CC</text>
  <circle cx="820" cy="280" r="64" fill="#3B82F6"/>
</svg>
```

**Step 2: Convert SVG to ICNS**

Use the `sips` macOS tool to convert:

```bash
# Create temporary PNGs at required sizes
mkdir -p /tmp/icon.iconset
for size in 16 32 64 128 256 512 1024; do
  sips -z $size $size resources/icon.png --out /tmp/icon.iconset/icon_${size}x${size}.png 2>/dev/null
done
# Also create @2x variants
for size in 16 32 128 256 512; do
  doubled=$((size * 2))
  cp /tmp/icon.iconset/icon_${doubled}x${doubled}.png /tmp/icon.iconset/icon_${size}x${size}@2x.png 2>/dev/null
done
iconutil -c icns /tmp/icon.iconset -o resources/icon.icns
```

Alternative: Use `electron-icon-maker` npm package, or manually export from any SVG editor at 1024x1024 PNG, then use `iconutil`.

The simplest approach: render the SVG to a 1024x1024 PNG (using a browser or `rsvg-convert`), then create the .iconset folder with all required sizes and run `iconutil`.

**Step 3: Update electron-builder.yml**

The `electron-builder.yml` already references `resources/` as `buildResources` directory. Electron-builder automatically picks up `icon.icns` from that directory. No changes needed if the file is named `icon.icns`.

**Step 4: Verify**

Run `npm run build` and check that the built app in `dist/mac-arm64/` has the custom icon.

**Step 5: Commit**

```bash
git add resources/icon.svg resources/icon.icns
git commit -m "feat: add custom app icon"
```

---

## Batch 2 — Backend Intelligence

### Task 4: Smart Granular Refresh

Make the file watcher detect which project changed and send targeted refresh events. Wire toast notifications to show what updated.

**Files:**
- Modify: `main/watchers/project-watcher.ts`
- Modify: `main/preload.ts`
- Modify: `shared/types.ts`
- Modify: `renderer/hooks/useProjects.ts`
- Modify: `renderer/pages/home.tsx`

**Step 1: Update project-watcher to detect which project changed**

Modify `main/watchers/project-watcher.ts`:

```typescript
import { BrowserWindow } from 'electron';
import chokidar from 'chokidar';
import { join, relative } from 'path';
import { homedir } from 'os';

const CLAUDE_DIR = join(homedir(), '.claude');

/**
 * Extracts a project identifier from a changed file path.
 * Claude stores data under ~/.claude/tasks/<team-or-project>/
 * and ~/.claude/teams/<team-name>/
 */
function extractProjectHint(filePath: string): string | null {
  const rel = relative(CLAUDE_DIR, filePath);
  const parts = rel.split('/');

  // tasks/<project-or-team>/... or teams/<team-name>/...
  if (parts.length >= 2 && (parts[0] === 'tasks' || parts[0] === 'teams')) {
    return parts[1];
  }

  // plans/<file>.md
  if (parts[0] === 'plans') {
    return null; // Global change, refresh all
  }

  // settings.json
  if (parts[0] === 'settings.json') {
    return '__settings__';
  }

  return null;
}

export function startProjectWatcher(mainWindow: BrowserWindow) {
  const watcher = chokidar.watch(
    [
      join(CLAUDE_DIR, 'tasks'),
      join(CLAUDE_DIR, 'teams'),
      join(CLAUDE_DIR, 'plans'),
      join(CLAUDE_DIR, 'settings.json'),
    ],
    {
      ignoreInitial: true,
      depth: 3,
      persistent: true,
    }
  );

  // Track changes per debounce window
  let pendingHints: Set<string> = new Set();
  let timeout: NodeJS.Timeout | null = null;

  watcher.on('all', (_event, filePath) => {
    const hint = extractProjectHint(filePath);
    if (hint) {
      pendingHints.add(hint);
    } else {
      pendingHints.add('__all__');
    }

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      try {
        if (!mainWindow.isDestroyed()) {
          const hints = Array.from(pendingHints);
          pendingHints = new Set();
          mainWindow.webContents.send('project-updated', {
            refresh: true,
            hints,
          });
        }
      } catch {
        // Window may have been destroyed
      }
    }, 500);
  });

  watcher.on('error', (err) => {
    console.error('File watcher error:', err);
  });

  return watcher;
}
```

**Step 2: Update shared types**

Add to `shared/types.ts`:

```typescript
export interface RefreshEvent {
  refresh: boolean;
  hints?: string[]; // Which projects/areas changed
}
```

**Step 3: Update useProjects hook to show toast on refresh**

Modify `renderer/hooks/useProjects.ts` to accept a toast callback and surface change hints:

```typescript
// In the onProjectUpdated listener callback:
const cleanup = window.api.onProjectUpdated((data: RefreshEvent | Project) => {
  if (data && 'refresh' in data && data.refresh) {
    const refreshData = data as RefreshEvent;
    fetchProjects();

    // Notify via callback if hints are available
    if (onRefresh && refreshData.hints) {
      onRefresh(refreshData.hints);
    }
  } else {
    const updatedProject = data as Project;
    setProjects((prev) =>
      prev.map((p) => (p.path === updatedProject.path ? updatedProject : p))
    );
  }
});
```

**Step 4: Wire toast in home.tsx**

In `renderer/pages/home.tsx`, use the toast to show what refreshed:

```typescript
const { addToast } = useToast();

// Pass refresh callback to useProjects
const { projects, loading, error, refresh } = useProjects((hints) => {
  if (hints.includes('__settings__')) {
    addToast('Settings updated', 'info');
  } else if (hints.includes('__all__')) {
    addToast('Projects refreshed', 'info');
  } else {
    addToast(`Updated: ${hints.join(', ')}`, 'info');
  }
});
```

**Step 5: Verify**

Run `npm run dev`. Open a separate terminal and modify a file under `~/.claude/tasks/` or `~/.claude/settings.json`. A toast should appear indicating what changed.

**Step 6: Commit**

```bash
git add main/watchers/project-watcher.ts shared/types.ts renderer/hooks/useProjects.ts renderer/pages/home.tsx
git commit -m "feat: smart granular refresh with toast notifications"
```

---

### Task 5: Project Health Indicators (Backend)

Add health metrics to each project: uncommitted file count, days since last commit, whether the project has outdated dependencies.

**Files:**
- Modify: `shared/types.ts`
- Modify: `main/ipc/projects.ts`

**Step 1: Add health types**

Add to `shared/types.ts`:

```typescript
export interface ProjectHealth {
  uncommittedCount: number;        // Number of dirty files
  daysSinceLastCommit: number | null; // null if no commits
  hasOutdatedDeps: boolean;        // true if package-lock.json is stale or deps outdated
}
```

Add `health: ProjectHealth | null` to the `Project` interface.

**Step 2: Implement health collection in projects.ts**

Add a helper function to `main/ipc/projects.ts`:

```typescript
import type { ProjectHealth } from '../../shared/types';

async function getProjectHealth(projectPath: string, git: SimpleGit | null): Promise<ProjectHealth | null> {
  try {
    let uncommittedCount = 0;
    let daysSinceLastCommit: number | null = null;
    let hasOutdatedDeps = false;

    if (git) {
      // Count uncommitted files
      const status = await git.status();
      uncommittedCount = status.files.length;

      // Days since last commit
      try {
        const log = await git.log({ maxCount: 1 });
        if (log.latest?.date) {
          const lastDate = new Date(log.latest.date);
          const now = new Date();
          daysSinceLastCommit = Math.floor(
            (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      } catch {
        daysSinceLastCommit = null;
      }
    }

    // Check if package-lock.json exists but is older than package.json
    const pkgPath = join(projectPath, 'package.json');
    const lockPath = join(projectPath, 'package-lock.json');
    try {
      const [pkgStat, lockStat] = await Promise.all([
        fs.stat(pkgPath).catch(() => null),
        fs.stat(lockPath).catch(() => null),
      ]);
      if (pkgStat && lockStat) {
        hasOutdatedDeps = pkgStat.mtimeMs > lockStat.mtimeMs;
      }
    } catch {}

    return { uncommittedCount, daysSinceLastCommit, hasOutdatedDeps };
  } catch {
    return null;
  }
}
```

Call this function inside the project building logic and attach the result to the Project object as `health`.

**Step 3: Verify**

Run `npm run dev`, check that `window.api.getProjects()` returns projects with `health` data in the console.

**Step 4: Commit**

```bash
git add shared/types.ts main/ipc/projects.ts
git commit -m "feat: add project health indicators to backend"
```

---

### Task 6: Real-time Session Monitoring (Backend)

Detect active Claude Code processes and match them to projects.

**Files:**
- Create: `main/ipc/sessions.ts`
- Modify: `main/preload.ts`
- Modify: `main/background.ts`
- Modify: `shared/types.ts`

**Step 1: Add session types**

Add to `shared/types.ts`:

```typescript
export interface ActiveSession {
  pid: number;
  projectPath: string;
  projectName: string;
  startTime: number;
  command: string;
}
```

Add to `IPC_CHANNELS`:
```typescript
GET_ACTIVE_SESSIONS: 'get-active-sessions',
```

**Step 2: Create sessions IPC handler**

Create `main/ipc/sessions.ts`:

```typescript
import { ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { basename } from 'path';
import { IPC_CHANNELS } from '../../shared/types';
import type { ActiveSession } from '../../shared/types';

const execAsync = promisify(exec);

/**
 * Detects active Claude Code processes by looking at running
 * processes that match the claude CLI pattern.
 */
async function detectActiveSessions(): Promise<ActiveSession[]> {
  try {
    // Find claude processes with their working directories
    const { stdout } = await execAsync(
      'ps -eo pid,lstart,command | grep -E "[c]laude" | grep -v "Claude Control Center"'
    );

    const sessions: ActiveSession[] = [];
    const lines = stdout.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      const match = line.match(/^\s*(\d+)\s+(.+?)\s+(\/.*claude.*)$/);
      if (!match) continue;

      const pid = parseInt(match[1], 10);
      const command = match[3].trim();

      // Try to get working directory of the process
      let projectPath = '';
      try {
        const { stdout: cwdOut } = await execAsync(`lsof -p ${pid} -Fn | grep '^n/' | head -1`);
        const cwdMatch = cwdOut.match(/^n(.+)$/m);
        if (cwdMatch) {
          projectPath = cwdMatch[1];
        }
      } catch {}

      // Alternative: check /proc-equivalent on macOS
      if (!projectPath) {
        try {
          const { stdout: pwdOut } = await execAsync(
            `lsof -a -p ${pid} -d cwd -Fn 2>/dev/null | grep '^n' | head -1`
          );
          const pwdMatch = pwdOut.match(/^n(.+)$/m);
          if (pwdMatch) {
            projectPath = pwdMatch[1];
          }
        } catch {}
      }

      if (projectPath) {
        sessions.push({
          pid,
          projectPath,
          projectName: basename(projectPath),
          startTime: Date.now(), // Approximate; lstart parsing is complex
          command,
        });
      }
    }

    return sessions;
  } catch {
    return [];
  }
}

export function registerSessionHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_ACTIVE_SESSIONS, async () => {
    return detectActiveSessions();
  });
}
```

**Step 3: Register handler in background.ts**

Add to `main/background.ts`:

```typescript
import { registerSessionHandlers } from './ipc/sessions';

// Inside the async IIFE, with the other register calls:
registerSessionHandlers();
```

**Step 4: Expose via preload**

Add to `main/preload.ts`:

```typescript
getActiveSessions: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ACTIVE_SESSIONS),
```

**Step 5: Update preload type definitions**

Add to `renderer/types/preload.d.ts` (or the existing API type):

```typescript
getActiveSessions: () => Promise<ActiveSession[]>;
```

**Step 6: Verify**

Run `npm run dev`. Open a terminal and run `claude` in any project. Call `window.api.getActiveSessions()` in the devtools console. It should return the active session with correct project path.

**Step 7: Commit**

```bash
git add main/ipc/sessions.ts main/background.ts main/preload.ts shared/types.ts
git commit -m "feat: add real-time session detection via process monitoring"
```

---

## Batch 3 — UI Integration

### Task 7: Health Indicators on Project Cards

Display health badges (uncommitted count, commit age, outdated deps) on each project card.

**Files:**
- Create: `renderer/components/shared/HealthBadge.tsx`
- Modify: `renderer/components/dashboard/ProjectCard.tsx`
- Modify: `renderer/components/project/ProjectOverview.tsx`

**Step 1: Create HealthBadge component**

Create `renderer/components/shared/HealthBadge.tsx`:

```tsx
import React from 'react';
import type { ProjectHealth } from '../../../shared/types';

interface HealthBadgeProps {
  health: ProjectHealth;
  compact?: boolean;
}

export default function HealthBadge({ health, compact = false }: HealthBadgeProps) {
  const items: { label: string; value: string; color: string }[] = [];

  if (health.uncommittedCount > 0) {
    items.push({
      label: 'Uncommitted',
      value: `${health.uncommittedCount} file${health.uncommittedCount > 1 ? 's' : ''}`,
      color: 'text-status-dirty',
    });
  }

  if (health.daysSinceLastCommit !== null && health.daysSinceLastCommit > 7) {
    items.push({
      label: 'Last commit',
      value: health.daysSinceLastCommit > 30
        ? `${Math.floor(health.daysSinceLastCommit / 30)}mo ago`
        : `${health.daysSinceLastCommit}d ago`,
      color: health.daysSinceLastCommit > 30 ? 'text-status-dirty' : 'text-text-tertiary',
    });
  }

  if (health.hasOutdatedDeps) {
    items.push({
      label: 'Deps',
      value: 'outdated',
      color: 'text-status-dirty',
    });
  }

  if (items.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {items.map((item) => (
          <span
            key={item.label}
            className={`text-[10px] font-medium ${item.color}`}
            title={`${item.label}: ${item.value}`}
          >
            {item.label === 'Uncommitted' && '●'}
            {item.label === 'Last commit' && '◷'}
            {item.label === 'Deps' && '▲'}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-surface-3 ${item.color}`}
        >
          {item.value}
        </span>
      ))}
    </div>
  );
}
```

**Step 2: Add to ProjectCard**

In `renderer/components/dashboard/ProjectCard.tsx`, import HealthBadge and render it below the git/stack info:

```tsx
import HealthBadge from '../shared/HealthBadge';

// Inside the card, after the stack tags section:
{project.health && <HealthBadge health={project.health} compact />}
```

**Step 3: Add to ProjectOverview**

In `renderer/components/project/ProjectOverview.tsx`, add a "Health" section:

```tsx
import HealthBadge from '../shared/HealthBadge';

// Add a health section at the top of the overview:
{project.health && (
  <section>
    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
      Health
    </h3>
    <HealthBadge health={project.health} />
  </section>
)}
```

**Step 4: Verify**

Run `npm run dev`. Projects with uncommitted changes should show warning indicators. Projects with old commits should show age. Check both compact (card) and full (detail) views.

**Step 5: Commit**

```bash
git add renderer/components/shared/HealthBadge.tsx renderer/components/dashboard/ProjectCard.tsx renderer/components/project/ProjectOverview.tsx
git commit -m "feat: display project health indicators on cards and detail view"
```

---

### Task 8: Session Monitor UI

Add a live session indicator to the dashboard and project cards.

**Files:**
- Create: `renderer/hooks/useSessions.ts`
- Create: `renderer/components/dashboard/ActiveSessions.tsx`
- Modify: `renderer/components/dashboard/Dashboard.tsx`
- Modify: `renderer/components/dashboard/ProjectCard.tsx`

**Step 1: Create useSessions hook**

Create `renderer/hooks/useSessions.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { ActiveSession } from '../../shared/types';

export function useActiveSessions(pollInterval = 5000) {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);

  const fetchSessions = useCallback(async () => {
    try {
      const result = await window.api.getActiveSessions();
      setSessions(result || []);
    } catch {
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, pollInterval);
    return () => clearInterval(interval);
  }, [fetchSessions, pollInterval]);

  const getSessionForProject = useCallback(
    (projectPath: string) => {
      return sessions.find((s) => s.projectPath === projectPath) || null;
    },
    [sessions]
  );

  return { sessions, getSessionForProject };
}
```

**Step 2: Create ActiveSessions component**

Create `renderer/components/dashboard/ActiveSessions.tsx`:

```tsx
import React from 'react';
import type { ActiveSession } from '../../../shared/types';

interface ActiveSessionsProps {
  sessions: ActiveSession[];
}

export default function ActiveSessions({ sessions }: ActiveSessionsProps) {
  if (sessions.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
        Live Sessions ({sessions.length})
      </h2>
      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.pid}
            className="flex items-center gap-3 px-3 py-2 rounded-card bg-surface-2 border border-border-subtle"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-active" />
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-text-primary">
                {session.projectName}
              </span>
              <span className="ml-2 text-xs text-text-tertiary font-mono">
                PID {session.pid}
              </span>
            </div>
            <span className="text-[10px] text-text-tertiary font-mono truncate max-w-[200px]">
              {session.projectPath}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Step 3: Wire into Dashboard**

In `renderer/components/dashboard/Dashboard.tsx`:

```tsx
import ActiveSessions from './ActiveSessions';

// Accept sessions as prop:
interface DashboardProps {
  // ... existing props
  activeSessions?: ActiveSession[];
}

// Render at the top of the dashboard content, before the project grid:
{activeSessions && activeSessions.length > 0 && (
  <ActiveSessions sessions={activeSessions} />
)}

// Also update the stats bar to show active sessions count:
// Add a new stat: { label: 'Live Sessions', value: activeSessions?.length || 0 }
```

**Step 4: Add session indicator to ProjectCard**

In `renderer/components/dashboard/ProjectCard.tsx`, accept an `isLive` boolean prop:

```tsx
// If isLive, show a pulsing green dot next to the project name
{isLive && (
  <span className="relative flex h-2 w-2 ml-1">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-status-active" />
  </span>
)}
```

**Step 5: Wire sessions from home.tsx**

In `renderer/pages/home.tsx`, use the `useActiveSessions` hook and pass data down:

```typescript
import { useActiveSessions } from '../hooks/useSessions';

const { sessions: activeSessions, getSessionForProject } = useActiveSessions();

// Pass to Dashboard:
<Dashboard ... activeSessions={activeSessions} />

// Pass isLive to each ProjectCard:
isLive={!!getSessionForProject(project.path)}
```

**Step 6: Verify**

Run `npm run dev`. Open a Claude Code session in a project directory. The dashboard should show a "Live Sessions" section with the pulsing green dot. The corresponding project card should also show the live indicator.

**Step 7: Commit**

```bash
git add renderer/hooks/useSessions.ts renderer/components/dashboard/ActiveSessions.tsx renderer/components/dashboard/Dashboard.tsx renderer/components/dashboard/ProjectCard.tsx renderer/pages/home.tsx
git commit -m "feat: add real-time session monitoring with live indicators"
```

---

### Task 9: Quick Actions Enhancement

Add "Launch Claude Code" button to project cards and detail view.

**Files:**
- Modify: `main/ipc/launch.ts`
- Modify: `main/preload.ts`
- Modify: `shared/types.ts`
- Modify: `renderer/components/dashboard/ProjectCard.tsx`
- Modify: `renderer/components/project/ProjectDetail.tsx`

**Step 1: Add IPC handler for launching Claude**

Add to `main/ipc/launch.ts`:

```typescript
ipcMain.handle(IPC_CHANNELS.LAUNCH_CLAUDE, async (_event, projectPath: string) => {
  const { exec } = require('child_process');
  // Open a new Terminal window and run claude in the project directory
  exec(
    `osascript -e 'tell application "Terminal" to do script "cd ${projectPath.replace(/'/g, "'\\''")} && claude"'`
  );
});
```

Add to `shared/types.ts` IPC_CHANNELS:
```typescript
LAUNCH_CLAUDE: 'launch-claude',
```

**Step 2: Expose via preload**

Add to `main/preload.ts`:

```typescript
launchClaude: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_CLAUDE, path),
```

**Step 3: Add button to ProjectCard**

In `renderer/components/dashboard/ProjectCard.tsx`, add a Claude launch button in the quick actions row:

```tsx
<button
  onClick={(e) => {
    e.stopPropagation();
    window.api.launchClaude(project.path);
  }}
  className="p-1.5 rounded-button text-text-tertiary hover:text-accent hover:bg-surface-3 transition-colors pointer-events-none group-hover:pointer-events-auto"
  aria-label="Launch Claude Code"
  title="Launch Claude Code"
>
  {/* Terminal-style icon with ">" prompt */}
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4 5l2.5 2L4 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7.5 9H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
</button>
```

**Step 4: Add button to ProjectDetail header**

In `renderer/components/project/ProjectDetail.tsx`, add a "Launch Claude" button alongside the existing Terminal/Editor/Finder buttons:

```tsx
<button
  onClick={() => window.api.launchClaude(project.path)}
  className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
>
  Launch Claude
</button>
```

**Step 5: Verify**

Run `npm run dev`. Click the Claude launch button on a project card. A new Terminal window should open with `claude` running in the project directory.

**Step 6: Commit**

```bash
git add main/ipc/launch.ts main/preload.ts shared/types.ts renderer/components/dashboard/ProjectCard.tsx renderer/components/project/ProjectDetail.tsx
git commit -m "feat: add Launch Claude Code quick action"
```

---

## Batch 4 — Distribution

### Task 10: Code Signing Configuration

Set up electron-builder for macOS code signing and notarization.

**Files:**
- Modify: `electron-builder.yml`
- Create: `scripts/notarize.js`

**Step 1: Update electron-builder.yml**

```yaml
appId: com.thxtype.claude-control-center
productName: Claude Control Center
copyright: Copyright © 2026 THXType Studio

mac:
  category: public.app-category.developer-tools
  identity: null  # Set to Apple Developer identity when available
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: resources/entitlements.mac.plist
  entitlementsInherit: resources/entitlements.mac.plist
  target:
    - target: dmg
      arch:
        - arm64

afterSign: scripts/notarize.js

directories:
  output: dist
  buildResources: resources

files:
  - from: .
    filter:
      - package.json
      - app

publish: null
```

**Step 2: Create entitlements file**

Create `resources/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>
</dict>
</plist>
```

**Step 3: Create notarize script**

Create `scripts/notarize.js`:

```javascript
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;

  // Only notarize if credentials are available
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    console.log('Skipping notarization: APPLE_ID or APPLE_APP_SPECIFIC_PASSWORD not set');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  console.log(`Notarizing ${appName}...`);

  await notarize({
    appBundleId: 'com.thxtype.claude-control-center',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });

  console.log('Notarization complete!');
};
```

**Step 4: Install notarize dependency**

```bash
npm install --save-dev @electron/notarize
```

**Step 5: Verify**

Run `npm run build`. Without Apple credentials set, the build should complete normally with "Skipping notarization" message. When credentials are set, notarization will be attempted.

**Step 6: Commit**

```bash
git add electron-builder.yml resources/entitlements.mac.plist scripts/notarize.js package.json package-lock.json
git commit -m "feat: add code signing and notarization configuration"
```

---

### Task 11: GitHub Repository Setup

Initialize git remote, create GitHub repo, and push.

**Step 1: Create GitHub repository**

```bash
gh repo create thxtype/claude-control-center --private --description "Desktop control center for Claude Code projects" --source . --push
```

Or if the user prefers public:

```bash
gh repo create thxtype/claude-control-center --public --description "Desktop control center for Claude Code projects" --source . --push
```

**Step 2: Verify**

```bash
git remote -v
# Should show github.com/thxtype/claude-control-center
git log --oneline
# All commits should be on remote
```

**Step 3: No code changes needed**

This is a git/GitHub operation only.

---

## Summary

| Batch | Task | Description |
|-------|------|-------------|
| 1 | Task 1 | Theme system (dark/light/system toggle) |
| 1 | Task 2 | Toast notification system |
| 1 | Task 3 | Custom app icon |
| 2 | Task 4 | Smart granular refresh + toast integration |
| 2 | Task 5 | Project health indicators (backend) |
| 2 | Task 6 | Real-time session monitoring (backend) |
| 3 | Task 7 | Health indicators UI |
| 3 | Task 8 | Session monitor UI |
| 3 | Task 9 | Quick actions (Launch Claude) |
| 4 | Task 10 | Code signing & notarization config |
| 4 | Task 11 | GitHub repository setup |

**Dependencies:**
- Task 4 depends on Task 2 (uses toast system)
- Task 7 depends on Task 5 (needs health data)
- Task 8 depends on Task 6 (needs session data)
- Tasks within each batch can be executed in order
- Batches 1→2→3 are sequential; Batch 4 is independent
