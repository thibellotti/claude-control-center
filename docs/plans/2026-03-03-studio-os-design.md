# Forma Studio OS — Design Document

## Positioning

Forma is the operating system for creative studios that use AI. Not an IDE. Not a Claude Code wrapper. The place where a studio manages client projects — from briefing to deploy — with AI agents as team members.

**Tagline:** "The studio operating system for the AI era."

**Competitive differentiation:**
- Cursor/Opcode/Warp = individual dev tools
- Linear/Notion = project management without AI execution
- Forma = studio workflow where AI agents execute real work inside client projects

**Target:** Solo creative dev → Small studio (2-8) → Mid agency (8-30). Freemium.

**Stack:** Electron + Next.js (renderer) + Supabase (sync/auth/storage) + Claude Code CLI (local, user's Pro/Max subscription).

---

## Architecture

```
Forma (Electron, Mac native)
├── Renderer (Next.js)
│   ├── Dashboard (client workspaces)
│   ├── Project Detail (3 tabs + agents)
│   ├── Orchestrator (multi-session Claude Code)
│   ├── Analytics (per-client cost tracking)
│   └── Settings
├── Main Process (Node.js)
│   ├── Claude Code CLI spawner (child processes)
│   ├── JSONL parser (session/usage data)
│   ├── Agent registry (SQLite)
│   ├── File system access
│   └── Supabase sync (Wave 2)
└── External
    ├── Supabase (auth, DB, storage, realtime) — Wave 2
    ├── Client Review Portal (Next.js on Vercel) — Wave 2
    ├── GitHub API (repo operations) — Wave 3
    ├── Vercel API (deploy) — Wave 3
    └── Figma API (design assets) — Wave 3
```

### Key architectural decisions

1. **Claude Code runs locally** with the user's Pro/Max subscription. Zero API cost.
2. **Each agent is a separate child process** spawning `claude` with custom system prompts.
3. **Analytics read from existing JSONL files** in `~/.claude/projects/` — zero overhead.
4. **SQLite for local agent registry** (same pattern as Opcode, proven at scale).
5. **Supabase added in Wave 2** for collaboration features. Wave 1 is fully local.

---

## Wave 1 — Foundation

### 1.1 Client Workspaces

Transform the dashboard from "list of folders" to "studio CRM".

**Data model:**
```typescript
interface ClientWorkspace {
  id: string;
  name: string;                    // "THXType", "Nonco", "Urbaniks"
  projects: Project[];             // existing projects filtered by client
  brandAssets?: {
    logo?: string;                 // file path
    colors?: string[];             // hex values
    typography?: string;           // font family
    guidelines?: string;           // notes / brand rules
  };
  notes?: string;                  // briefing, constraints, preferences
  budget?: {
    totalAllocated?: number;       // R$ allocated for this client
    totalSpent: number;            // computed from JSONL analytics
  };
  createdAt: number;
  updatedAt: number;
}
```

**Storage:** JSON file at `~/.forma/clients.json` (Wave 1). Migrates to Supabase in Wave 2.

**UI changes:**
- Dashboard shows Client Workspaces as primary navigation (not raw project list)
- Each workspace card shows: client name, project count, total AI cost, active sessions
- Click into workspace → see projects, brand assets, notes, analytics
- The existing project.client field auto-groups into workspaces

### 1.2 CC Agents

Custom AI agents with pre-configured system prompts, spawned as isolated Claude Code processes.

**Data model (SQLite):**
```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,                       -- emoji or icon name
  system_prompt TEXT NOT NULL,
  model TEXT DEFAULT 'claude',
  default_task TEXT,
  timeout_seconds INTEGER DEFAULT 900,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES agents(id),
  agent_name TEXT NOT NULL,
  task TEXT,
  project_path TEXT NOT NULL,
  client_id TEXT,
  session_id TEXT,
  status TEXT DEFAULT 'running',   -- running | completed | failed | killed
  pid INTEGER,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);
```

**Spawning mechanism:**
```typescript
// Main process
function spawnAgent(agent: Agent, projectPath: string, task: string) {
  const proc = spawn('claude', [
    '--print',
    '--system-prompt', agent.systemPrompt,
    '--model', agent.model,
    '-p', task,
  ], {
    cwd: projectPath,
    env: { ...process.env },
  });
  // Track in registry, stream output to renderer
}
```

**Built-in agent templates:**
- Code Reviewer — reviews code for quality, security, patterns
- Brand Auditor — checks consistency with client brand guide
- Documentation Agent — generates/updates docs
- Refactoring Agent — suggests and applies refactors
- Test Writer — generates tests for existing code

**UI:**
- New "Agents" section in sidebar navigation
- Agent library page: list, create, edit, delete agents
- "Run Agent" button on ProjectDetail → select agent → provide task → spawns process
- Agent execution view: streaming output, status, kill button
- Agent run history per project

### 1.3 Analytics per Client

Read usage data from Claude Code JSONL session files. Aggregate by client workspace.

**Parser:** Read `~/.claude/projects/{encoded_path}/{session_id}.jsonl` files. Extract:
- Token counts (input/output) per message
- Model used
- Timestamps
- Map project path → client via ClientWorkspace associations

**UI (new Analytics page, accessible from client workspace):**
- Total cost per client (sum of all projects)
- Cost per project within client
- Tokens breakdown (input vs output)
- Sessions per period (daily/weekly/monthly)
- Simple bar chart (reuse existing chart component from removed UsageSection)
- Export CSV button for client billing

### 1.4 CLAUDE.md Manager

**Scanner:** Recursively discover all CLAUDE.md and .claude/ directories across registered projects.

**UI:**
- Accessible from sidebar ("Instructions" or "CLAUDE.md")
- Tree view organized by client → project
- Click to open in built-in markdown editor with live preview
- Edit and save back to file system
- "Sync to project" indicator (shows if file is stale)

---

## Wave 2 — Collaboration Layer

### 2.1 Supabase Integration

**Services used:**
- Auth: email/password + magic link for clients
- Database: clients, projects, reviews, comments (mirrors local data)
- Storage: brand assets, handoff packages, screenshots
- Realtime: review comments, status updates

**Sync strategy:**
- Local-first: app works fully offline
- Sync on demand: user chooses when to push/pull
- Conflict resolution: last-write-wins with manual merge for notes

### 2.2 Client Review Portal

Separate Next.js app deployed on Vercel. Minimal, read-only (with comments).

**Flow:**
1. Studio publishes a review from Forma → uploads screenshots + diff + preview URL to Supabase
2. Generates a shareable link: `review.forma.studio/{review_id}`
3. Client opens link → sees screenshots, live preview, changelog
4. Client leaves comments (stored in Supabase)
5. Comments sync back to Forma app in realtime

**UI (client-facing):** Clean, minimal, no auth required (link = access). Optional PIN for sensitive projects.

### 2.3 Handoff Generator

**Generates:**
- HANDOFF.md (auto-generated summary of what was built, decisions made, next steps)
- Screenshots (captured or uploaded)
- Deploy URL
- Changelog (from git log)
- Brand asset usage report

**Output:** ZIP file uploaded to Supabase Storage. Shareable link.

---

## Wave 3 — Power User Features

### 3.1 Multi-tab Sessions
- Multiple Claude Code sessions open in tabs
- State preserved between tab switches (conditional rendering, not unmount)
- Individual process kill
- Tab shows: project name, agent name (if applicable), status indicator

### 3.2 Session Resume + Fork
- Resume: `claude --resume {session_id}` from UI
- Fork: clone session state, start new branch of conversation
- Session list shows: first message, duration, token count, status

### 3.3 Deploy Integration
- Vercel deploy from ProjectDetail
- Preview URL generation
- Deploy status tracking
- Associate deploy URLs with client reviews

### 3.4 Figma Bridge
- Import design tokens from Figma API
- Import screenshots/assets
- Associate with client brand guide
- Auto-populate brandAssets in ClientWorkspace

---

## What stays from current Forma

- Dashboard (reorganized around client workspaces)
- ProjectDetail (3 tabs: overview, components, sessions)
- Orchestrator (multi-session Claude Code)
- Settings (appearance, permissions, environment, plugins, info)
- Sidebar navigation
- Command palette
- Toast system
- Design system (colors, typography, spacing)

## What gets removed permanently

- OnboardingWizard (already removed)
- Visual Editor (code preserved but inaccessible, already done)
- Account/Usage in Settings (already removed — analytics moves to client workspace)
- DirigirCanvas, ProjectWorkspace, PreviewWorkspace (already removed)

## What gets added

| Wave | Feature | Complexity |
|------|---------|------------|
| 1 | Client Workspaces | Medium |
| 1 | CC Agents (registry + execution) | High |
| 1 | Analytics per Client | Medium |
| 1 | CLAUDE.md Manager | Low |
| 2 | Supabase Integration | High |
| 2 | Client Review Portal | High |
| 2 | Handoff Generator | Medium |
| 3 | Multi-tab Sessions | Medium |
| 3 | Session Resume + Fork | Medium |
| 3 | Deploy Integration | Low |
| 3 | Figma Bridge | Medium |
