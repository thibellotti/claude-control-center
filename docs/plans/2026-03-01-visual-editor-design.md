# Visual Editor — Design Document

**Date:** 2026-03-01
**Status:** Approved
**Author:** Thiago Bellotti + Claude

## Overview

A fullscreen Visual Editor mode for Forma that allows designers to interact directly with the rendered preview — clicking elements, editing props, adjusting Tailwind styles, dragging to reorder, and describing changes in natural language. Every action is applied live to the codebase via Claude, with instant undo via git checkpoints.

## Decisions

| Decision | Choice |
|---|---|
| Interaction level | Full visual (drag + props sidebar + point-and-prompt) |
| Layout | Fullscreen dedicated mode |
| Apply mode | Live (instant, each action via Claude) |
| Stack target | React + Tailwind first, basic fallback for others |
| DOM access | Injected overlay script via postMessage |
| Undo mechanism | Git stash checkpoints (instant) |
| Prompt strategy | Auto-built with full context |

## Architecture

### Layout (Fullscreen Mode)

The Visual Editor is a fullscreen mode activated from any project with a running dev server.

```
+--------------------------------------------------------------+
| < Back   [Desktop] [Tablet] [Mobile]   [Undo] [Redo]  gear  |  <- Toolbar
+------------------------------------+-------------------------+
|                                    | Selected: <Button>      |
|                                    |                         |
|    +-------------------------+     | Props                   |
|    |                         |     | - variant: "primary"    |
|    |   iframe + overlay.js   |     | - size: "lg"            |
|    |                         |     | - disabled: false       |
|    |   hover -> blue outline |     |                         |
|    |   click -> select       |     | Styles                  |
|    |   drag  -> reorder      |     | - bg: #3B82F6           |
|    |                         |     | - px: 16  py: 8         |
|    |                         |     | - rounded: lg           |
|    +-------------------------+     |                         |
|                                    | +-----------------------+|
|                                    | | "make this button     ||
|                                    | |  larger and add       ||
|                                    | |  a hover effect"      ||
|                                    | +-----------------------+|
|                                    | [Apply with Claude >]   |
+------------------------------------+-------------------------+
| Lightning Claude: Updating Button component... ####-- 2/3    |  <- Status bar
+--------------------------------------------------------------+
```

3 panels:
1. **Toolbar** (top) — viewport presets, undo/redo, settings
2. **Canvas** (left, ~65%) — iframe with injected overlay.js
3. **Inspector** (right, ~35%) — props, styles, tree, prompt input

## Overlay Script (overlay.js)

A lightweight (~5KB) standalone script injected into the preview iframe via Electron's `webContents.executeJavaScript` when Visual Editor mode activates.

### Responsibilities

**1. Hover Inspection**
- Intercepts `mousemove` on the document
- Draws a blue outline (2px, `#3B82F6`) around the element under cursor
- Floating tooltip shows: `<Button className="px-4 py-2">`
- Ignores overlay's own elements

**2. Element Selection (click)**
- Click selects the element, outline becomes solid with corner handles
- Collects data and sends to Forma via `postMessage`:

```typescript
window.parent.postMessage({
  type: 'forma:select',
  payload: {
    selector: 'main > div:nth-child(2) > button',
    tagName: 'button',
    className: 'px-4 py-2 bg-blue-500 text-white rounded-lg',
    textContent: 'Submit',
    computedStyles: { width, height, padding, margin, color, background },
    boundingRect: { x, y, width, height },
    // React-specific (when available):
    reactComponent: 'Button',
    reactProps: { variant: 'primary', size: 'lg', disabled: false },
    reactFiber: true,
  }
}, '*');
```

**3. React Fiber Detection**
- Searches for `__reactFiber$` or `__reactInternalInstance$` on the DOM element
- If found, walks the fiber tree to extract:
  - Component name (`_debugOwner.type.name`)
  - Current props
  - Source file path (`_debugSource.fileName`)
- This feeds the props sidebar with real data

**4. Drag & Reorder**
- After selection, drag handles appear
- Drag calculates nearest sibling via `getBoundingClientRect`
- Sends `forma:reorder` with `{ selector, targetSelector, position: 'before' | 'after' }`
- CSS transform for visual feedback during drag

**5. Bidirectional Communication**
```
iframe -> Forma:  postMessage('forma:select' | 'forma:hover' | 'forma:reorder')
Forma -> iframe:  postMessage('forma:highlight' | 'forma:deselect' | 'forma:scroll-to')
```

### Security
- Overlay never modifies the app's DOM (visual overlays only via CSS absolute)
- Completely removed when exiting Visual Editor mode
- Only executes on localhost URLs

## Inspector Panel

### Tab 1: Props (React-specific)

Only appears when React fiber is detected. Shows component props with native controls:

- Union types -> dropdown
- Booleans -> checkbox
- Strings -> text input
- Functions -> read-only label
- Slots -> add button for empty optional children

On change: Forma sends a targeted prompt to Claude identifying the component, file, line, and exact prop change.

### Tab 2: Styles (Tailwind-aware)

Works for any element. Parses `className` to extract Tailwind classes grouped by category:

- **Layout**: display, direction, align, gap
- **Spacing**: padding, margin (sliders stepping by 4px grid)
- **Colors**: background, text, border (color pickers)
- **Typography**: size, weight, family (dropdowns)
- **Border**: radius, width (dropdowns)

Tailwind mapping:
- `px-4` -> slider value 16, step 4 (4, 8, 12, 16, 24, 32...)
- `bg-blue-500` -> color picker starts at #3B82F6
- `rounded-lg` -> dropdown with tokens: none, sm, md, lg, xl, full

On change: reconstructs className and sends to Claude.

Fallback: if not Tailwind (detected via tailwind.config.js), shows computed CSS with raw inputs.

### Tab 3: Tree

Simplified DOM tree showing the hierarchy of the selected component:
- Click any node selects it on canvas
- Drag nodes in tree reorders (equivalent to canvas drag)
- React component names when fiber available, otherwise HTML tags

### Prompt Input (fixed at Inspector footer)

Always visible, contextual to selected element:
- Pre-fills context: "Selected: `<Button>` in `src/components/ui/Button.tsx`"
- Accepts attachments (Figma screenshots, reference images)
- Apply triggers the existing request system with enriched prompt
- Shows "Applying..." with progress while Claude works

## Data Flow

```
Designer action
    |
    v
Overlay captures context (element, selector, component, file, props, classes)
    |
    v
Forma buildVisualEditPrompt() — enriches with file path, current state, constraints
    |
    v
Main process executeRequest() — spawns `claude --print` with enriched prompt
    |
    v
Claude edits file(s) on disk
    |
    v
Dev server HMR detects change, pushes update to iframe
    |
    v
Overlay re-selects the same element (by selector), Inspector refreshes
```

## Prompt Builder

Forma never sends the raw designer prompt to Claude. Builds an enriched prompt:

- Context header: "You are editing a React + Tailwind project in Forma's Visual Editor"
- Target element: component name, file path, line number, current className, current props
- Requested change: prop change, style change, reorder, or free-form prompt
- Constraints: only edit specified file, preserve functionality, use Tailwind classes, follow 8pt grid

## Undo/Redo

Each Visual Editor action creates a checkpoint:

- Before each action: `git stash push -m "forma-checkpoint-{id}"` in main process
- **Undo**: `git stash pop` to restore previous state -> HMR updates
- **Redo**: re-execute the cached request prompt
- Stack maximum: 50 checkpoints, FIFO cleanup
- Checkpoints cleaned on exit from Visual Editor mode

This solves the "live apply" risk — any action is instantly reversible via git stash without depending on Claude.

## New IPC Channels

```typescript
VISUAL_EDITOR_INJECT:     'visual-editor:inject'      // inject overlay into preview
VISUAL_EDITOR_REMOVE:     'visual-editor:remove'       // remove overlay
VISUAL_EDITOR_EXECUTE:    'visual-editor:execute'      // run a visual action
VISUAL_EDITOR_UNDO:       'visual-editor:undo'         // undo last action
VISUAL_EDITOR_REDO:       'visual-editor:redo'         // redo last undone action
VISUAL_EDITOR_CHECKPOINT: 'visual-editor:checkpoint'   // create git checkpoint
```

## File Structure

```
main/
  ipc/
    visual-editor.ts              # IPC handlers (inject, undo, checkpoint)
  helpers/
    prompt-builder.ts             # buildVisualEditPrompt()

renderer/
  components/
    visual-editor/
      VisualEditorPage.tsx        # fullscreen layout (toolbar + canvas + inspector)
      Toolbar.tsx                 # viewport presets, undo/redo, exit
      Canvas.tsx                  # iframe wrapper + postMessage listener
      Inspector.tsx               # tabs container
      PropsTab.tsx                # React props controls
      StylesTab.tsx               # Tailwind-aware style controls
      TreeTab.tsx                 # component hierarchy
      PromptInput.tsx             # contextual prompt with attachments
      StatusBar.tsx               # real-time feedback
  hooks/
    useVisualEditor.ts            # state: selected element, checkpoints, mode

scripts/
  overlay.js                      # injected into iframe (standalone, no deps)
```

## Status Bar

```
Idle:      Lightning Ready -- Click an element to start editing
Working:   Lightning Claude: Updating Button component... (2.1s)
Success:   Check Applied -- "px-4" -> "px-6" in Button.tsx
Error:     X Failed -- Could not locate element in source. Try the prompt instead.
```
