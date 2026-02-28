# Dirigir — Product Design Document

> **"Design is building."**

## Overview

Dirigir is a desktop app (Electron + Next.js) where designers operate full web applications using Claude as the execution engine. No terminal. No code. Just real-time visual results.

The designer creates Requests in natural language, watches Claude build live, reviews visual diffs, annotates directly on the preview, and deploys with one click.

**Target User:** Pure designer (knows Figma, not terminal). Full operator — manages the entire project without needing a developer.

**Project Scope:** Full web apps (auth, dashboards, CRUD, APIs).

**Business Model:** SaaS monthly ($29-79/mo), BYOK (user provides their own Anthropic API key).

**Killer Feature:** Real-time visibility — the designer SEES what Claude is doing live, with visual preview updating as code changes.

---

## Product Identity

- **Name:** Dirigir
- **Tagline:** "Design is building."
- **Positioning:** The first tool where designers build production web apps with AI, visually.
- **Persona:** Luna, 28, senior UI designer at an agency. Masters Figma, understands design systems, knows what she wants to build but depends on devs to execute. With Dirigir, she operates herself.

### Pricing

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 1 project, no deploy, no Figma bridge |
| Pro | $29/mo | Unlimited projects, deploy, Figma bridge, visual diff, Design Replay |
| Team | $79/mo/seat | Shared workspaces, approval workflows, usage dashboard per member |

---

## Core UX Architecture

```
+-------------+----------------------------+-------------+
|  Sidebar    |  Canvas Area               |  Inspector  |
|             |                            |             |
|  Projects   |  Live Preview              |  Activity   |
|  Pages      |  (full rendered app)       |  Feed       |
|  Requests   |                            |  Tokens     |
|  History    |  -- or --                  |  Figma      |
|             |                            |  Annotations|
|  [Deploy]   |  Split Reality (A/B)       |             |
|  [Settings] |  Design Replay (slider)    |             |
+-------------+----------------------------+-------------+
```

### Sidebar (left)
Project navigation. No file trees. Shows:
- **Pages** — app routes, displayed as visual cards
- **Requests** — task queue with status
- **History** — visual timeline (Design Replay)
- **Deploy** button at bottom

### Canvas (center)
Live preview of the running app. Designer can click any element to annotate.

Top bar contains:
- URL bar (navigate between pages/routes)
- Viewport selector (desktop / tablet / mobile)
- Split Reality toggle (A/B mode)
- Design Replay slider (time machine)

### Inspector (right)
Context-aware panel showing:
- Activity feed (translated from Claude's raw tool calls)
- Design tokens (colors, typography, spacing)
- Figma links
- Annotation threads

---

## The Request System

Designers don't write code or terminal commands. They write **Requests** — natural language instructions that get sent to Claude Code under the hood.

### Request Input

A floating bar at the bottom of the canvas (Spotlight/Raycast style), accessible via `Cmd+K`:

```
+----------------------------------------------+
| "Make the pricing cards have rounded          |
|  corners and a subtle shadow"           [Go]  |
|                                               |
| Attach: [Figma link] [Screenshot] [Reference] |
+----------------------------------------------+
```

### Request Types

| Type | Description |
|------|-------------|
| Text | Natural language description of desired change |
| Figma link | Paste Figma URL, app extracts design context automatically |
| Annotation | Click elements on preview, annotate, submit all as one request |
| Reference | Paste URL of an inspiration site, app screenshots and sends as visual context |

### Request Lifecycle

```
Drafted -> Queued -> In Progress (live) -> Review -> Approved / Rejected
```

While "In Progress", the designer sees Claude working live in the activity feed and the preview updating in real time.

---

## Real-time Visibility Layer

The live feed translates Claude's raw technical actions into designer-friendly language:

| Claude does | Designer sees |
|---|---|
| `Edit: src/components/Header.tsx` | "Updating Header component" |
| `Bash: npm install framer-motion` | "Adding animation library" |
| `Read: tailwind.config.js` | "Checking design tokens" |
| `Glob: **/*.tsx` | "Scanning project structure" |
| `Write: src/pages/pricing.tsx` | "Creating Pricing page" |

Each feed entry is clickable — expands to show the visual change that specific action caused (mini screenshot diff).

A progress indicator shows estimated completion based on request complexity.

---

## Design Replay (Time Machine)

Every request completion triggers an automatic full-page screenshot. These accumulate as a visual timeline.

```
[o-----------o--------o------o--------o-- Now]
 v1.0       header   colors  cards   pricing
```

- **Drag slider** — preview shows the app at that point in time
- **Click dot** — see what changed (visual diff)
- **"Restore to here"** — Claude reverts all changes after that point
- **Export** — timeline as PDF/video for client presentations

This replaces git for designers. No branches, no commits, no merge conflicts. Just a visual timeline they can scrub through.

---

## Split Reality (A/B)

Designer can request two versions simultaneously:

1. Writes request: *"Try two versions of the hero: one minimal with just text, one with a large background image"*
2. Claude creates both in parallel (git branches under the hood, invisible to designer)
3. Canvas splits into two side-by-side previews
4. Designer picks one, or cherry-picks: *"Take the typography from A and the layout from B"*
5. Claude merges. Single preview returns.

---

## Annotated Preview

The most natural interaction for designers:

1. **Hover** over any element in preview — element highlights with blue outline
2. **Click** — annotation bubble appears
3. **Type** feedback: *"Make this 16px larger"* or *"Change to the blue from our palette"*
4. **Attach** Figma reference to any annotation
5. **Accumulate** multiple annotations — "Submit all" sends as one request to Claude
6. **Persist** — annotations stay until resolved (like Figma comments)

---

## Onboarding Flow

```
1. Welcome -> "Dirigir lets you build web apps visually with AI"
2. API Key -> Guided setup for Anthropic key (with link + instructions)
3. First Project -> Choose: [New from template] or [Open existing folder]
4. Templates: "SaaS Dashboard" / "Landing Page" / "E-commerce" / "Portfolio" / "Blank"
5. Quick tour -> Highlights: Request bar, Preview, Activity feed, Annotations
6. First request -> Pre-filled: "Add a hero section with a heading and CTA button"
7. Watch Claude build it live -> "This is Dirigir."
```

---

## Transformation Map

What changes from the current developer-oriented architecture:

| Current (dev tool) | Dirigir (designer tool) |
|---|---|
| Terminal tabs | Hidden (power user setting) |
| File tree in sidebar | "Pages" (routes) + "Components" (visual gallery) |
| Git status badges | Design Replay timeline |
| package.json info | "Tech" badge (auto-detected, non-editable) |
| Task list (dev format) | Request queue (visual cards) |
| Raw live feed | Translated activity with visual diffs |
| Manual deploy config | One-click deploy with preview URL |
| Editor blocks (markdown) | Annotated preview (click-to-edit) |
| Workspaces (folder grouping) | Client workspaces (branded, shareable) |

---

## MVP Scope

### v1.0 (Launch)

- Request system (text + Figma link input)
- Live preview with real-time updates
- Translated activity feed
- Annotated preview (click -> comment -> submit)
- Design Replay (screenshot timeline + slider)
- One-click deploy (Vercel)
- Project templates (3: Landing Page, Dashboard, Blank)
- Onboarding wizard
- Account system + Stripe billing

### v1.1

- Split Reality (A/B)
- Reference URL screenshots
- Component gallery (visual)
- Token studio (visual editor)
- Team workspaces

### Future

- Figma as Source of Truth (auto-sync on save)
- Component marketplace (designers publish/install components)
- Live collab with Claude (drag-to-reposition elements)
- Client sharing (read-only preview links with commenting)
- Storyboard Mode (visual flow -> app architecture)
- Mood Board -> App (reference images -> design tokens -> code)

---

## Technical Architecture Notes

The current Electron + Next.js (Nextron) architecture supports this transformation:

- **Preview workspace** (react-resizable-panels + iframe) becomes the Canvas
- **Live feed** (JSONL file watching) becomes the translated Activity Feed
- **Visual diff** (screenshot capture + comparison) powers Design Replay
- **Figma bridge** (MCP integration) powers Figma link extraction
- **Deploy panel** (Vercel/Netlify CLI) becomes one-click deploy
- **Token studio** (Tailwind config parsing) becomes the visual token editor
- **Component gallery** (codebase scanning) becomes the visual component browser

New infrastructure needed:
- **Request -> Claude Code bridge** — translates natural language requests into Claude Code sessions
- **Screenshot automation** — automatic capture on every request completion
- **Account system** — auth, billing (Stripe), feature gating
- **Activity translator** — maps tool_use events to designer-friendly descriptions
- **Annotation overlay** — click-to-annotate on the preview iframe
- **Git abstraction** — Design Replay slider backed by git commits, invisible to user
