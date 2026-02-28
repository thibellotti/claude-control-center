export interface GitInfo {
  branch: string;
  status: 'clean' | 'dirty';
  lastCommit: {
    hash: string;
    message: string;
    date: string;
    author: string;
  } | null;
  remoteUrl: string | null;
  ahead: number;
  behind: number;
}

export interface TaskItem {
  id: string;
  subject: string;
  description: string;
  activeForm: string;
  owner: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deleted';
  blocks: string[];
  blockedBy: string[];
  metadata: Record<string, unknown>;
}

export interface TeamMember {
  agentId: string;
  name: string;
  agentType: string;
  model: string;
  color: string;
  joinedAt: number;
  cwd: string;
}

export interface Team {
  name: string;
  description: string;
  createdAt: number;
  leadAgentId: string;
  members: TeamMember[];
}

export interface PackageJsonInfo {
  name: string;
  version: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface ProjectHealth {
  uncommittedCount: number;
  daysSinceLastCommit: number | null;
  hasOutdatedDeps: boolean;
}

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
  health: ProjectHealth | null;
}

export interface ActiveSession {
  pid: number;
  projectPath: string;
  projectName: string;
  startTime: number;
  command: string;
  sessionLabel: string | null; // first user prompt, truncated
}

export interface SessionEntry {
  display: string;
  timestamp: number;
  project: string;
  sessionId: string;
}

export interface ClaudeSettings {
  permissions: {
    allow: string[];
  };
  env: Record<string, string>;
  enabledPlugins: Record<string, boolean>;
}

export interface RefreshEvent {
  refresh: boolean;
  hints?: string[];
}

export interface ClaudeMdBlock {
  id: string;
  type: 'heading' | 'rule' | 'text' | 'list' | 'code';
  content: string;
  level?: number;
  language?: string;
}

export interface PreviewState {
  url: string | null;
  isRunning: boolean;
  port: number | null;
  output: string[];
  error: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string; // hex color for the workspace dot/accent
  projectPaths: string[];
  createdAt: number;
  updatedAt: number;
}

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

export interface DesignTokens {
  colors: Record<string, string | Record<string, string>>;
  spacing: Record<string, string>;
  fontFamily: Record<string, string[]>;
  fontSize: Record<string, string | [string, { lineHeight?: string }]>;
  borderRadius: Record<string, string>;
  raw: string; // the full tailwind config content for raw editing
}

export interface SessionAction {
  id: string;
  timestamp: string;
  type: 'file_read' | 'file_write' | 'file_edit' | 'command' | 'text' | 'error';
  description: string;
  filePath?: string;
  detail?: string;
}

export interface SessionTimeline {
  sessionId: string;
  fileName: string;
  startTime: string;
  endTime: string;
  actionCount: number;
  actions: SessionAction[];
}

export interface ScreenshotEntry {
  id: string;
  label: string;
  timestamp: number;
  imagePath: string; // absolute path to stored PNG
  url: string;
  viewport: { width: number; height: number };
  commitHash?: string;
  commitMessage?: string;
}

export interface FigmaLink {
  id: string;
  figmaUrl: string;
  nodeId: string;
  fileKey: string;
  label: string;
  createdAt: number;
}

export interface HandoffPackage {
  projectName: string;
  projectPath: string;
  generatedAt: number;
  overview: string | null;
  plan: string | null;
  gitBranch: string | null;
  gitStatus: string | null;
  recentCommits: { hash: string; message: string; date: string; author: string }[];
  tasks: { subject: string; status: string; owner: string }[];
  fileTree: string;
  techStack: string[];
  dependencies: Record<string, string>;
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
}

export interface ComponentInfo {
  name: string;
  filePath: string;
  relativePath: string;
  exportType: 'default' | 'named';
  props: ComponentProp[];
  lineCount: number;
  hasTests: boolean;
  directory: string; // parent directory name for grouping
}

export interface DeployConfig {
  provider: 'vercel' | 'netlify' | 'none';
  lastDeployUrl?: string;
  lastDeployTime?: number;
  lastDeployStatus?: 'success' | 'error';
}

export interface DeployResult {
  success: boolean;
  url?: string;
  error?: string;
  output: string[];
  timestamp: number;
}

export interface UsageEntry {
  date: string; // YYYY-MM-DD
  projectPath: string;
  projectName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  sessionCount: number;
}

export interface UsageSummary {
  entries: UsageEntry[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  totalSessions: number;
}

// === Live Preview + Integration Panel Types ===

export type PreviewStatus = 'idle' | 'detecting' | 'installing' | 'starting' | 'ready' | 'error';

export interface EnhancedPreviewState {
  status: PreviewStatus;
  url: string | null;
  port: number | null;
  output: string[];
  error: string | null;
  scriptName: string | null;
}

export interface ConsoleEntry {
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
}

export interface VercelDeployment {
  url: string;
  state: string;
  createdAt: number;
  source: string;
}

export interface VercelProjectInfo {
  detected: boolean;
  projectName: string | null;
  productionUrl: string | null;
  framework: string | null;
}

export interface GitHubCommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitHubPRInfo {
  number: number;
  title: string;
  state: string;
  author: string;
  updatedAt: string;
  url: string;
}

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  remoteUrl: string;
  commits: GitHubCommitInfo[];
  pullRequests: GitHubPRInfo[];
}

// -- Forma Request System --

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

// -- Orchestrator --

export type LayoutPreset = 'focus' | 'split' | 'quad' | 'main-side';

export type CellType = 'terminal' | 'feed' | 'taskboard' | 'preview';

export interface CellConfigTerminal {
  type: 'terminal';
  sessionId: string;
  label: string;
  cwd: string;
  command?: string;
}

export interface CellConfigFeed {
  type: 'feed';
  projectPath: string;
  label: string;
}

export interface CellConfigTaskBoard {
  type: 'taskboard';
  teamName: string;
  label: string;
}

export interface CellConfigPreview {
  type: 'preview';
  url: string;
  label: string;
  projectPath?: string;
}

export type OrchestratorCellConfig = CellConfigTerminal | CellConfigFeed | CellConfigTaskBoard | CellConfigPreview;

export interface OrchestratorCell {
  id: string;
  config: OrchestratorCellConfig;
}

export interface OrchestratorWorkspace {
  cells: OrchestratorCell[];
  layout: LayoutPreset;
}

export const IPC_CHANNELS = {
  GET_PROJECTS: 'get-projects',
  GET_PROJECT_DETAIL: 'get-project-detail',
  GET_CLAUDE_SETTINGS: 'get-claude-settings',
  GET_SESSIONS: 'get-sessions',
  OPEN_IN_TERMINAL: 'open-in-terminal',
  OPEN_IN_EDITOR: 'open-in-editor',
  OPEN_IN_FINDER: 'open-in-finder',
  PROJECT_UPDATED: 'project-updated',
  REFRESH_PROJECTS: 'refresh-projects',
  GET_ACTIVE_SESSIONS: 'get-active-sessions',
  LAUNCH_CLAUDE: 'launch-claude',
  READ_FILE: 'read-file',
  WRITE_FILE: 'write-file',
  GET_PROMPTS: 'get-prompts',
  SAVE_PROMPT: 'save-prompt',
  DELETE_PROMPT: 'delete-prompt',
  START_DEV_SERVER: 'start-dev-server',
  STOP_DEV_SERVER: 'stop-dev-server',
  GET_DEV_SERVER_STATUS: 'get-dev-server-status',
  GET_WORKSPACES: 'get-workspaces',
  SAVE_WORKSPACE: 'save-workspace',
  DELETE_WORKSPACE: 'delete-workspace',
  GET_SESSION_TIMELINES: 'get-session-timelines',
  GET_SESSION_TIMELINE_DETAIL: 'get-session-timeline-detail',
  SCAN_COMPONENTS: 'scan-components',
  CAPTURE_SCREENSHOT: 'capture-screenshot',
  GET_SCREENSHOTS: 'get-screenshots',
  DELETE_SCREENSHOT: 'delete-screenshot',
  GET_SCREENSHOT_IMAGE: 'get-screenshot-image',
  GET_FIGMA_LINKS: 'get-figma-links',
  SAVE_FIGMA_LINK: 'save-figma-link',
  DELETE_FIGMA_LINK: 'delete-figma-link',
  GENERATE_HANDOFF: 'generate-handoff',
  EXPORT_HANDOFF: 'export-handoff',
  DETECT_DEPLOY_PROVIDER: 'detect-deploy-provider',
  DEPLOY_PROJECT: 'deploy-project',
  GET_DEPLOY_HISTORY: 'get-deploy-history',
  GET_USAGE_STATS: 'get-usage-stats',
  PTY_CREATE: 'pty-create',
  PTY_WRITE: 'pty-write',
  PTY_RESIZE: 'pty-resize',
  PTY_KILL: 'pty-kill',
  PTY_DATA: 'pty-data',
  PTY_EXIT: 'pty-exit',
  PTY_LIST: 'pty-list',
  LIVE_FEED_START: 'live-feed-start',
  LIVE_FEED_STOP: 'live-feed-stop',
  LIVE_FEED_DATA: 'live-feed-data',
  PREVIEW_FILE_CHANGED: 'preview-file-changed',
  PREVIEW_STATUS_UPDATE: 'preview-status-update',
  PREVIEW_START_WATCHING: 'preview-start-watching',
  PREVIEW_STOP_WATCHING: 'preview-stop-watching',
  GET_SUPABASE_INFO: 'get-supabase-info',
  GET_VERCEL_DEPLOYMENTS: 'get-vercel-deployments',
  GET_VERCEL_PROJECT_INFO: 'get-vercel-project-info',
  GET_GITHUB_INFO: 'get-github-info',
  // Request System
  CREATE_REQUEST: 'create-request',
  GET_REQUESTS: 'get-requests',
  CANCEL_REQUEST: 'cancel-request',
  APPROVE_REQUEST: 'approve-request',
  REJECT_REQUEST: 'reject-request',
  REQUEST_STATUS_UPDATE: 'request-status-update',
  REQUEST_FEED_UPDATE: 'request-feed-update',
  GET_PROJECT_PAGES: 'get-project-pages',
  GET_TEMPLATES: 'get-templates',
  CREATE_FROM_TEMPLATE: 'create-from-template',
  PICK_DIRECTORY: 'pick-directory',
  GET_ACCOUNT: 'get-account',
  SAVE_ACCOUNT: 'save-account',
  GET_PLAN_LIMITS: 'get-plan-limits',
  OPEN_BILLING_PORTAL: 'open-billing-portal',
} as const;
