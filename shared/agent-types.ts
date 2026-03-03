export interface Agent {
  id: string;
  name: string;
  icon: string;                    // emoji
  systemPrompt: string;
  model: string;                   // 'claude' (default) — legacy field
  providerId?: string;             // provider id (e.g. 'claude', 'codex', 'gemini')
  modelId?: string;                // specific model id (e.g. 'claude-sonnet-4-6')
  defaultTask?: string;
  timeoutSeconds: number;          // default 900 (15 min)
  createdAt: number;
  updatedAt: number;
}

export interface AgentRun {
  id: string;
  agentId: string;
  agentName: string;
  agentIcon: string;
  task: string;
  projectPath: string;
  clientId?: string;
  status: 'running' | 'completed' | 'failed' | 'killed';
  pid?: number;
  output: string;
  startedAt: number;
  completedAt?: number;
}

export const DEFAULT_AGENTS: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Code Reviewer',
    icon: '\u{1F50D}',
    systemPrompt: 'You are a senior code reviewer. Review the code for bugs, security issues, performance problems, and style inconsistencies. Be concise and actionable.',
    model: 'claude',
    defaultTask: 'Review recent changes in this project',
    timeoutSeconds: 600,
  },
  {
    name: 'Documentation',
    icon: '\u{1F4DD}',
    systemPrompt: 'You are a documentation specialist. Generate or update documentation for the codebase. Focus on public APIs, component props, and architecture decisions.',
    model: 'claude',
    defaultTask: 'Generate documentation for this project',
    timeoutSeconds: 900,
  },
  {
    name: 'Test Writer',
    icon: '\u{1F9EA}',
    systemPrompt: 'You are a test engineer. Write comprehensive tests for the codebase. Focus on edge cases, error handling, and integration tests.',
    model: 'claude',
    defaultTask: 'Write tests for untested code in this project',
    timeoutSeconds: 900,
  },
  {
    name: 'Refactoring',
    icon: '\u267B\uFE0F',
    systemPrompt: 'You are a refactoring specialist. Identify and apply refactoring opportunities. Focus on reducing complexity, eliminating duplication, and improving naming.',
    model: 'claude',
    defaultTask: 'Identify refactoring opportunities in this project',
    timeoutSeconds: 900,
  },
];
