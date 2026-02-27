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
} as const;
