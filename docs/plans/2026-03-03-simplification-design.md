# Forma Simplification — Orchestrator-First Design

## Philosophy
Forma is a Claude Code orchestrator. Users open it, see their projects, and with 1 click they're in a Claude session. Everything else gets out of the way.

## Decisions
- Core use case: Orchestrator-first (open project -> Claude session -> work)
- Premium features (Figma Bridge, Visual Editor, Plan/Billing, Deploy, Diff, Tokens): hide from UI, keep code
- Onboarding wizard: remove completely
- ProjectDetail tabs: 3 essential (Overview, Components, Sessions)
- Dead code: hide from UI but do not delete files

## Changes

### Sidebar (no change)
Dashboard | Orchestrator | Prompts | Settings

### Dashboard
- Remove: hover actions on ProjectCards (confusing, undiscoverable)
- Add: visible "Open in Claude" button directly on ProjectCard (single primary CTA)
- ActiveSessions: add "Jump to session" button that navigates to Orchestrator
- Keep: stats bar, client grouping, accordion

### ProjectDetail — 3 tabs + clean header
Header reduced from 8 buttons to 3:
1. "Open in Claude" (primary, accent color)
2. "Editor" (secondary, opens VS Code)
3. "..." dropdown with: Autopilot, Finder, Handoff, Edit CLAUDE.md

Tabs: Overview | Components | Sessions (remove Tokens, Deploy, Design, Diff)
Modals kept: Handoff and CLAUDE.md (accessible via "..." dropdown)

### Settings — Clean sections
- Remove: Account section (API key, plan cards, billing)
- Remove: Usage section
- Keep: Appearance, Permissions, Environment, Plugins, Info
- Add to read-only sections: "Edit in editor" button to open ~/.claude/settings.json

### Onboarding — Remove
- Remove useOnboarding check in home.tsx
- App opens directly to Dashboard

### Sidebar Cmd+click — Remove
- Normal click = open ProjectDetail (as-is)
- Remove secret Cmd+click = Autopilot behavior

### AppLayout — Simplify
- Remove dead showProjectView branch (DirigirCanvas/ProjectWorkspace never executes)
- Keep only the `<main>{children}</main>` path

### Visual Editor — Hide
- Remove "Visual Editor" button from ProjectDetail header
- Remove visual-editor page state from home.tsx
- Do NOT delete the files

## Resulting Flow
Dashboard -> click project -> ProjectDetail (3 tabs) -> "Open in Claude" -> Orchestrator
