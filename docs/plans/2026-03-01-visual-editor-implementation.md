# Visual Editor — Implementation Plan

**Date:** 2026-03-01
**Design:** [2026-03-01-visual-editor-design.md](./2026-03-01-visual-editor-design.md)
**Estimated steps:** 10

---

## Phase 1: Foundation

### Step 1 — IPC Channels & Types

Add Visual Editor types and IPC channels to the shared type system.

**Files:**
- `shared/types.ts` — add IPC_CHANNELS entries, VisualAction, VisualCheckpoint, SelectedElement, VisualEditorState types

**Types to add:**
```typescript
interface SelectedElement {
  selector: string;
  tagName: string;
  className: string;
  textContent: string;
  computedStyles: Record<string, string>;
  boundingRect: { x: number; y: number; width: number; height: number };
  reactComponent?: string;
  reactProps?: Record<string, unknown>;
  reactFiber: boolean;
  sourceFile?: string;
  sourceLine?: number;
}

type VisualActionType = 'prop-change' | 'style-change' | 'reorder' | 'prompt';

interface VisualAction {
  id: string;
  type: VisualActionType;
  element: SelectedElement;
  // prop-change
  propName?: string;
  oldValue?: string;
  newValue?: string;
  // style-change
  oldClass?: string;
  newClass?: string;
  // reorder
  targetSelector?: string;
  position?: 'before' | 'after';
  // prompt
  userPrompt?: string;
  attachments?: string[];
}

interface VisualCheckpoint {
  id: string;
  timestamp: number;
  action: VisualAction;
  stashRef: string;
  status: 'applied' | 'undone';
}

interface VisualEditorState {
  active: boolean;
  selectedElement: SelectedElement | null;
  checkpoints: VisualCheckpoint[];
  undoIndex: number;
  isApplying: boolean;
  lastError: string | null;
  viewport: 'desktop' | 'tablet' | 'mobile';
}
```

**Acceptance:** TypeScript compiles with no errors.

---

### Step 2 — Overlay Script (overlay.js)

Create the standalone script that gets injected into the preview iframe. No framework deps — pure DOM.

**File:** `scripts/overlay.js`

**Implement in order:**
1. Overlay container (absolute positioned, pointer-events: none, z-index: 99999)
2. Hover handler — mousemove listener, draws outline box around hovered element
3. Click handler — selects element, draws solid outline with handles
4. Data collector — gathers tagName, className, computedStyles, boundingRect, textContent
5. React fiber detector — walks `__reactFiber$` for component name, props, source file
6. Drag handler — mousedown on handles, calculates drop target via getBoundingClientRect
7. postMessage sender — sends forma:hover, forma:select, forma:reorder events
8. postMessage receiver — listens for forma:highlight, forma:deselect, forma:scroll-to
9. Self-cleanup — removeOverlay() function that strips all event listeners and DOM elements

**Acceptance:** Script can be loaded in a browser console on any React+Tailwind localhost page and correctly highlights/selects elements with React component names in the postMessage payload.

---

### Step 3 — Main Process: visual-editor.ts

IPC handlers for the Visual Editor.

**File:** `main/ipc/visual-editor.ts`

**Handlers:**
1. `VISUAL_EDITOR_INJECT` — get the preview iframe's webContents via BrowserWindow, inject overlay.js via `executeJavaScript`
2. `VISUAL_EDITOR_REMOVE` — execute cleanup function in iframe
3. `VISUAL_EDITOR_EXECUTE` — build prompt, create git checkpoint, run request via existing executeRequest flow
4. `VISUAL_EDITOR_UNDO` — `git stash pop` to restore previous checkpoint
5. `VISUAL_EDITOR_REDO` — re-apply cached action prompt
6. `VISUAL_EDITOR_CHECKPOINT` — `git stash push -m "forma-checkpoint-{id}"`

**Dependencies:** Uses `simple-git` for stash operations, reuses `executeRequest` from requests.ts (extract to shared if needed).

**Register in:** `main/background.ts`

**File:** `main/helpers/prompt-builder.ts`

**Functions:**
- `buildVisualEditPrompt(action: VisualAction): string` — constructs the enriched prompt with context header, target element, change description, and constraints

**Acceptance:** Inject/remove cycle works. Undo creates and pops git stashes correctly.

---

## Phase 2: Renderer Foundation

### Step 4 — useVisualEditor Hook

Central state management for the Visual Editor.

**File:** `renderer/hooks/useVisualEditor.ts`

**State:**
- `active: boolean` — is Visual Editor mode on
- `selectedElement: SelectedElement | null` — current selection from overlay
- `checkpoints: VisualCheckpoint[]` — undo/redo stack
- `undoIndex: number` — current position in stack
- `isApplying: boolean` — Claude is working
- `lastError: string | null`
- `viewport: 'desktop' | 'tablet' | 'mobile'`

**Methods:**
- `activate(projectPath)` — inject overlay, enter fullscreen mode
- `deactivate()` — remove overlay, clean checkpoints, exit
- `handleOverlayMessage(event)` — process postMessage from iframe
- `executeAction(action)` — create checkpoint, build prompt, call IPC
- `undo()` / `redo()` — navigate checkpoint stack
- `setViewport(preset)` — change iframe width

**Listens to:** window `message` event for postMessage from iframe, request status updates for applying state.

**Acceptance:** Hook manages state correctly, postMessage events populate selectedElement.

---

### Step 5 — VisualEditorPage + Canvas + Toolbar

The fullscreen layout shell.

**Files:**
- `renderer/components/visual-editor/VisualEditorPage.tsx` — fullscreen layout with 3 panels
- `renderer/components/visual-editor/Canvas.tsx` — iframe wrapper, listens to postMessage, forwards to hook
- `renderer/components/visual-editor/Toolbar.tsx` — viewport presets, undo/redo buttons, back button

**Canvas details:**
- Wraps the existing preview iframe URL
- Applies viewport width transitions: desktop (100%), tablet (768px), mobile (375px)
- Centers iframe in canvas area with gray background when viewport < 100%
- Forwards all `forma:*` postMessages to `useVisualEditor.handleOverlayMessage`

**Toolbar details:**
- Back button: calls `deactivate()`, returns to previous page
- Viewport buttons: Desktop / Tablet / Mobile with active indicator
- Undo/Redo: enabled/disabled based on checkpoint stack
- Badge showing checkpoint count

**Navigation:** Add `'visual-editor'` to `currentPage` states in `home.tsx`. Entry point: button in PreviewPanel or ProjectDetail when dev server is running.

**Acceptance:** Entering Visual Editor shows fullscreen layout with working iframe, toolbar buttons change viewport width, back returns to previous view.

---

### Step 6 — StatusBar

**File:** `renderer/components/visual-editor/StatusBar.tsx`

**States:**
- Idle: "Ready — Click an element to start editing"
- Selecting: "Selected: <Button> in Button.tsx"
- Applying: "Claude: Updating Button component..." with elapsed timer
- Success: "Applied — 'px-4' -> 'px-6' in Button.tsx" (auto-dismiss after 3s)
- Error: "Failed — Could not locate element" (persists until next action)

**Listens to:** `isApplying`, `lastError`, `selectedElement` from useVisualEditor.

**Acceptance:** Status bar reflects all state transitions correctly.

---

## Phase 3: Inspector

### Step 7 — Inspector Shell + PropsTab

**Files:**
- `renderer/components/visual-editor/Inspector.tsx` — tab container (Props / Styles / Tree)
- `renderer/components/visual-editor/PropsTab.tsx` — React props editor

**Inspector:**
- 3 tabs, Props tab hidden when `selectedElement.reactFiber === false`
- Selected element header: icon + component name + file path
- Tabs use the existing shared Tabs component

**PropsTab:**
- Renders controls based on prop value types:
  - string -> text input
  - boolean -> checkbox
  - union/enum -> dropdown (detect from TypeScript types if available, fallback to current value)
  - number -> number input with stepper
  - function -> read-only "(handler)" label
- On change: calls `executeAction({ type: 'prop-change', propName, oldValue, newValue })`

**Acceptance:** Selecting a React component shows its props with working controls. Changing a prop triggers Claude execution and HMR updates the preview.

---

### Step 8 — StylesTab

**File:** `renderer/components/visual-editor/StylesTab.tsx`

**Tailwind class parser:**
- Split className by spaces
- Categorize each class: layout (flex, grid, items-*, justify-*), spacing (p-*, m-*, gap-*), colors (bg-*, text-*, border-*), typography (text-sm, font-bold), border (rounded-*, border-*)
- Map to control type: spacing -> slider (step 4, values: 0,4,8,12,16,24,32,48,64), colors -> color picker, typography/border -> dropdown

**Controls:**
- Spacing sliders: labeled with px value, step by 4 (8pt grid)
- Color pickers: initialize from Tailwind color, output nearest Tailwind class
- Dropdowns: populated from Tailwind token scale (sm, md, lg, xl, etc.)

**Tailwind color mapping:**
- Parse `bg-blue-500` -> resolve to hex via bundled Tailwind default palette
- Color picker change -> find nearest Tailwind class match
- If exact match not found, use arbitrary value `bg-[#hex]`

**On change:** Reconstruct full className, diff against original, call `executeAction({ type: 'style-change', oldClass, newClass })`.

**Non-Tailwind fallback:** Show computed styles grouped by category with raw CSS value inputs.

**Acceptance:** Style controls render for selected elements. Changing a slider updates the Tailwind class and Claude applies it.

---

### Step 9 — TreeTab + Drag Reorder

**File:** `renderer/components/visual-editor/TreeTab.tsx`

**Tree construction:**
- Overlay sends DOM hierarchy as part of `forma:select` payload (parent chain up to body, children 2 levels deep)
- Display as indented tree with expand/collapse
- React component names when available, HTML tags as fallback
- Currently selected node highlighted

**Interactions:**
- Click node -> send `forma:scroll-to` to overlay, update selection
- Drag node -> calculate new position, call `executeAction({ type: 'reorder', targetSelector, position })`

**Also add drag support to Canvas.tsx:**
- When overlay sends `forma:reorder`, Canvas forwards to hook
- Hook calls `executeAction` with reorder type

**Acceptance:** Tree reflects DOM hierarchy. Clicking a tree node selects it in canvas. Drag reorder triggers Claude to move elements in code.

---

### Step 10 — PromptInput + Entry Points

**File:** `renderer/components/visual-editor/PromptInput.tsx`

**UI:**
- Fixed at bottom of Inspector panel
- Textarea with placeholder contextual to selection
- Attachment button (reuse existing attachment logic from request system)
- "Apply with Claude" button
- When no element selected: "Select an element first, or describe a page-level change"
- When element selected: "Describe a change to <Button>..."

**On submit:** Call `executeAction({ type: 'prompt', userPrompt, attachments })`.

**Entry points (add "Visual Editor" button):**
- `renderer/components/preview/PreviewPanel.tsx` — button in preview toolbar when dev server is running
- `renderer/components/project/ProjectDetail.tsx` — button in project actions when dev server is running

**Navigation wiring in home.tsx:**
- Add `'visual-editor'` case to page rendering
- Pass `projectPath` and `previewUrl` to VisualEditorPage

**Acceptance:** Full Visual Editor flow works end-to-end: enter from preview, select element, change prop/style/prompt, Claude applies, HMR updates, undo works.

---

## Implementation Order

```
Step 1 (types)
  |
  v
Step 2 (overlay.js) -----> Step 3 (main IPC)
                               |
                               v
                           Step 4 (hook)
                               |
                               v
                    Step 5 (page + canvas + toolbar)
                               |
                               v
                           Step 6 (status bar)
                               |
                               v
                    Step 7 (inspector + props)
                               |
                               v
                        Step 8 (styles tab)
                               |
                               v
                    Step 9 (tree + drag reorder)
                               |
                               v
                  Step 10 (prompt + entry points)
```

Steps 2 and 3 can be done in parallel after Step 1.

## Testing Strategy

Each step has its own acceptance criteria. Integration test at the end:

1. Start dev server for a React+Tailwind project
2. Enter Visual Editor from preview
3. Hover elements — see blue outlines with component names
4. Click a Button — Inspector shows props (variant, size) and Tailwind styles
5. Change `variant` from "primary" to "secondary" — Claude edits, HMR updates
6. Change `px-4` to `px-6` via slider — Claude edits, HMR updates
7. Type "add a subtle shadow" in prompt — Claude adds shadow class
8. Undo — git stash restores, HMR reverts
9. Redo — re-applies the change
10. Drag a NavLink below another — Claude reorders in JSX
11. Switch viewport to mobile — iframe resizes
12. Exit Visual Editor — overlay removed, back to project view
