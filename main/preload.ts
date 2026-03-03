import { contextBridge, ipcRenderer } from 'electron';
import type {
  EnhancedPreviewState,
  DesignRequest,
  TranslatedFeedEntry,
  Prompt,
  Workspace,
  FigmaLink,
  RequestAttachment,
  VisualAction,
} from '../shared/types';
import type { ClientWorkspace } from '../shared/client-types';
import type { Agent } from '../shared/agent-types';
import { IPC_CHANNELS } from '../shared/types';

const api = {
  getProjects: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECTS),
  getProjectDetail: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECT_DETAIL, path),
  getClaudeSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CLAUDE_SETTINGS),
  getSessions: (projectPath?: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_SESSIONS, projectPath),
  openInTerminal: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_IN_TERMINAL, path),
  openInEditor: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_IN_EDITOR, path),
  openInFinder: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_IN_FINDER, path),
  refreshProjects: () => ipcRenderer.invoke(IPC_CHANNELS.REFRESH_PROJECTS),
  getActiveSessions: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ACTIVE_SESSIONS),
  launchClaude: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_CLAUDE, path),
  readFile: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke(IPC_CHANNELS.WRITE_FILE, filePath, content),
  getPrompts: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PROMPTS),
  savePrompt: (prompt: Partial<Prompt> & { title: string; content: string }) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_PROMPT, prompt),
  deletePrompt: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_PROMPT, id),
  startDevServer: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.START_DEV_SERVER, projectPath),
  stopDevServer: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.STOP_DEV_SERVER, projectPath),
  getDevServerStatus: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_DEV_SERVER_STATUS, projectPath),
  getWorkspaces: () => ipcRenderer.invoke(IPC_CHANNELS.GET_WORKSPACES),
  saveWorkspace: (workspace: Partial<Workspace> & { name: string }) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_WORKSPACE, workspace),
  deleteWorkspace: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_WORKSPACE, id),
  getSessionTimelines: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_SESSION_TIMELINES, projectPath),
  getSessionTimelineDetail: (projectPath: string, fileName: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_SESSION_TIMELINE_DETAIL, projectPath, fileName),
  scanComponents: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.SCAN_COMPONENTS, projectPath),
  captureScreenshot: (opts: { url: string; label: string; projectId: string; viewport: { width: number; height: number }; commitHash?: string; commitMessage?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_SCREENSHOT, opts),
  getScreenshots: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_SCREENSHOTS, projectId),
  deleteScreenshot: (opts: { projectId: string; screenshotId: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_SCREENSHOT, opts),
  getScreenshotImage: (imagePath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_SCREENSHOT_IMAGE, imagePath),
  getFigmaLinks: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_FIGMA_LINKS, projectId),
  saveFigmaLink: (projectId: string, link: Partial<FigmaLink> & { figmaUrl: string; fileKey: string }) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_FIGMA_LINK, projectId, link),
  deleteFigmaLink: (projectId: string, linkId: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_FIGMA_LINK, projectId, linkId),
  generateHandoff: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GENERATE_HANDOFF, projectPath),
  exportHandoff: (projectPath: string, format: 'markdown' | 'json') => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_HANDOFF, projectPath, format),
  detectDeployProvider: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.DETECT_DEPLOY_PROVIDER, projectPath),
  deployProject: (projectPath: string, provider: 'vercel' | 'netlify') => ipcRenderer.invoke(IPC_CHANNELS.DEPLOY_PROJECT, projectPath, provider),
  getDeployHistory: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_DEPLOY_HISTORY, projectPath),
  getVercelDeployments: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_VERCEL_DEPLOYMENTS, projectPath),
  getVercelProjectInfo: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_VERCEL_PROJECT_INFO, projectPath),
  getUsageStats: (days: number) => ipcRenderer.invoke(IPC_CHANNELS.GET_USAGE_STATS, days),
  getSupabaseInfo: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_SUPABASE_INFO, projectPath),
  getGitHubInfo: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_GITHUB_INFO, projectPath),
  getPRDetail: (opts: { projectPath: string; prNumber: number }) => ipcRenderer.invoke(IPC_CHANNELS.GET_PR_DETAIL, opts),
  createPR: (opts: { projectPath: string; title: string; body: string; baseBranch?: string; draft?: boolean }) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_PR, opts),
  getPRChecks: (opts: { projectPath: string; prNumber: number }) => ipcRenderer.invoke(IPC_CHANNELS.GET_PR_CHECKS, opts),

  // CLAUDE.md Manager
  scanClaudeMd: (projects: { path: string; name: string; client?: string | null }[]) => ipcRenderer.invoke(IPC_CHANNELS.SCAN_CLAUDEMD, projects),
  readClaudeMd: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.READ_CLAUDEMD, filePath),
  writeClaudeMd: (filePath: string, content: string) => ipcRenderer.invoke(IPC_CHANNELS.WRITE_CLAUDEMD, filePath, content),

  // Client Workspaces
  getClients: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CLIENTS),
  saveClient: (client: ClientWorkspace) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_CLIENT, client),
  deleteClient: (clientId: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_CLIENT, clientId),
  seedClientsFromProjects: (projects: { client?: string | null }[]) => ipcRenderer.invoke(IPC_CHANNELS.SEED_CLIENTS_FROM_PROJECTS, projects),

  // Analytics
  getAnalytics: (opts: { projects: { path: string; name: string; client?: string | null }[]; days: number }) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ANALYTICS, opts),

  // CC Agents
  getAgents: () => ipcRenderer.invoke(IPC_CHANNELS.GET_AGENTS),
  saveAgent: (agent: Agent) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_AGENT, agent),
  deleteAgent: (agentId: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_AGENT, agentId),
  runAgent: (opts: { agentId: string; projectPath: string; task: string }) => ipcRenderer.invoke(IPC_CHANNELS.RUN_AGENT, opts),
  killAgentRun: (runId: string) => ipcRenderer.invoke(IPC_CHANNELS.KILL_AGENT_RUN, runId),
  getAgentRuns: (projectPath?: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_AGENT_RUNS, projectPath),
  onAgentOutput: (callback: (data: { runId: string; data: string }) => void) => {
    const handler = (_: unknown, payload: { runId: string; data: string }) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.AGENT_OUTPUT, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.AGENT_OUTPUT, handler); };
  },
  onAgentExit: (callback: (data: { runId: string; status: string }) => void) => {
    const handler = (_: unknown, payload: { runId: string; status: string }) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.AGENT_EXIT, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.AGENT_EXIT, handler); };
  },

  // Terminal (PTY)
  ptyCreate: (opts: { cwd?: string; command?: string }) => ipcRenderer.invoke(IPC_CHANNELS.PTY_CREATE, opts),
  ptyWrite: (id: string, data: string) => ipcRenderer.invoke(IPC_CHANNELS.PTY_WRITE, { id, data }),
  ptyResize: (id: string, cols: number, rows: number) => ipcRenderer.invoke(IPC_CHANNELS.PTY_RESIZE, { id, cols, rows }),
  ptyKill: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PTY_KILL, { id }),
  ptyList: () => ipcRenderer.invoke(IPC_CHANNELS.PTY_LIST),
  onPtyData: (callback: (data: { id: string; data: string }) => void) => {
    const handler = (_: unknown, payload: { id: string; data: string }) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.PTY_DATA, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.PTY_DATA, handler); };
  },
  onPtyExit: (callback: (data: { id: string; exitCode: number; signal: number }) => void) => {
    const handler = (_: unknown, payload: { id: string; exitCode: number; signal: number }) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.PTY_EXIT, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.PTY_EXIT, handler); };
  },

  // Live Feed
  liveFeedStart: () => ipcRenderer.invoke(IPC_CHANNELS.LIVE_FEED_START),
  liveFeedStop: () => ipcRenderer.invoke(IPC_CHANNELS.LIVE_FEED_STOP),
  onLiveFeedData: (callback: (entries: unknown[]) => void) => {
    const handler = (_: unknown, entries: unknown[]) => callback(entries);
    ipcRenderer.on(IPC_CHANNELS.LIVE_FEED_DATA, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.LIVE_FEED_DATA, handler); };
  },

  // Live Preview event listeners
  onPreviewFileChanged: (callback: (data: { projectPath: string; filePath: string }) => void) => {
    const handler = (_: unknown, payload: { projectPath: string; filePath: string }) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.PREVIEW_FILE_CHANGED, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.PREVIEW_FILE_CHANGED, handler); };
  },
  onPreviewStatusUpdate: (callback: (state: EnhancedPreviewState) => void) => {
    const handler = (_: unknown, payload: EnhancedPreviewState) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.PREVIEW_STATUS_UPDATE, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.PREVIEW_STATUS_UPDATE, handler); };
  },
  previewStartWatching: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.PREVIEW_START_WATCHING, projectPath),
  previewStopWatching: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.PREVIEW_STOP_WATCHING, projectPath),

  // Request System (Forma)
  createRequest: (data: { projectId: string; projectPath: string; prompt: string; attachments?: RequestAttachment[] }) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_REQUEST, data),
  getRequests: (projectId?: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_REQUESTS, projectId),
  cancelRequest: (requestId: string) => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_REQUEST, requestId),
  approveRequest: (requestId: string) => ipcRenderer.invoke(IPC_CHANNELS.APPROVE_REQUEST, requestId),
  rejectRequest: (requestId: string) => ipcRenderer.invoke(IPC_CHANNELS.REJECT_REQUEST, requestId),
  onRequestStatusUpdate: (callback: (request: DesignRequest) => void) => {
    const handler = (_: unknown, data: DesignRequest) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.REQUEST_STATUS_UPDATE, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.REQUEST_STATUS_UPDATE, handler); };
  },
  onRequestFeedUpdate: (callback: (entry: TranslatedFeedEntry) => void) => {
    const handler = (_: unknown, data: TranslatedFeedEntry) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.REQUEST_FEED_UPDATE, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.REQUEST_FEED_UPDATE, handler); };
  },

  getProjectPages: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECT_PAGES, projectPath),

  getTemplates: () => ipcRenderer.invoke(IPC_CHANNELS.GET_TEMPLATES),
  createFromTemplate: (opts: { templateId: string; projectName: string; parentDir?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_FROM_TEMPLATE, opts),
  pickDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.PICK_DIRECTORY),

  getAccount: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ACCOUNT),
  saveAccount: (updates: Record<string, unknown>) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_ACCOUNT, updates),
  getPlanLimits: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PLAN_LIMITS),
  openBillingPortal: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_BILLING_PORTAL),

  onProjectUpdated: (callback: (data: { refresh?: boolean } | Record<string, unknown>) => void) => {
    const handler = (_: unknown, project: { refresh?: boolean } | Record<string, unknown>) => callback(project);
    ipcRenderer.on(IPC_CHANNELS.PROJECT_UPDATED, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.PROJECT_UPDATED, handler); };
  },

  // Visual Editor
  visualEditorInject: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.VISUAL_EDITOR_INJECT, projectPath),
  // Injects the overlay script into the iframe's WebFrame via Electron's native API,
  // bypassing cross-origin restrictions that block renderer-side contentDocument access.
  visualEditorInjectFrame: (frameUrl: string) => ipcRenderer.invoke(IPC_CHANNELS.VISUAL_EDITOR_INJECT_FRAME, frameUrl),
  visualEditorRemove: () => ipcRenderer.invoke(IPC_CHANNELS.VISUAL_EDITOR_REMOVE),
  visualEditorExecute: (opts: { projectPath: string; action: VisualAction; checkpointId: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.VISUAL_EDITOR_EXECUTE, opts),
  visualEditorUndo: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.VISUAL_EDITOR_UNDO, projectPath),
  visualEditorRedo: (projectPath: string, action: VisualAction) => ipcRenderer.invoke(IPC_CHANNELS.VISUAL_EDITOR_REDO, projectPath, action),
  visualEditorCheckpoint: (projectPath: string, checkpointId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VISUAL_EDITOR_CHECKPOINT, projectPath, checkpointId),

  // Session Checkpoints
  createCheckpoint: (opts: { projectPath: string; name: string; description?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_CHECKPOINT, opts),
  getCheckpoints: (projectPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CHECKPOINTS, { projectPath }),
  restoreCheckpoint: (opts: { projectPath: string; checkpointId: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.RESTORE_CHECKPOINT, opts),
  deleteCheckpoint: (opts: { projectPath: string; checkpointId: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_CHECKPOINT, opts),

  // MCP Servers
  getMcpServers: (projectPath?: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_MCP_SERVERS, projectPath),
  addMcpServer: (opts: { name: string; config: { command: string; args?: string[]; env?: Record<string, string>; cwd?: string }; scope: string; projectPath?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_MCP_SERVER, opts),
  removeMcpServer: (opts: { name: string; scope: string; projectPath?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.REMOVE_MCP_SERVER, opts),
  testMcpServer: (opts: { command: string; args?: string[] }) =>
    ipcRenderer.invoke(IPC_CHANNELS.TEST_MCP_SERVER, opts),

  // Diff Viewer
  getGitDiff: (opts: { projectPath: string; fromRef?: string; toRef?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_GIT_DIFF, opts),
  getGitStatusLive: (projectPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_GIT_STATUS_LIVE, projectPath),

  // Session History Search
  saveSessionOutput: (opts: { sessionId: string; projectPath: string; projectName: string; command?: string; output: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_SESSION_OUTPUT, opts),
  searchSessions: (opts: { query: string; isRegex?: boolean; projectPath?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_SESSIONS, opts),
  getSessionHistory: (opts?: { projectPath?: string; limit?: number }) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SESSION_HISTORY, opts),

  // Worktree Agents
  worktreeCreate: (opts: { projectPath: string; branchName?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKTREE_CREATE, opts),
  worktreeList: (opts?: { projectPath?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKTREE_LIST, opts),
  worktreeDiff: (worktreeSessionId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKTREE_DIFF, { worktreeSessionId }),
  worktreeMerge: (worktreeSessionId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKTREE_MERGE, { worktreeSessionId }),
  worktreeRemove: (worktreeSessionId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKTREE_REMOVE, { worktreeSessionId }),
  worktreeSpawnAgent: (opts: { worktreeSessionId: string; command?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKTREE_SPAWN_AGENT, opts),
  onWorktreePtyData: (callback: (data: { worktreeSessionId: string; data: string }) => void) => {
    const handler = (_: unknown, payload: { worktreeSessionId: string; data: string }) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.WORKTREE_PTY_DATA, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.WORKTREE_PTY_DATA, handler); };
  },
  onWorktreePtyExit: (callback: (data: { worktreeSessionId: string; exitCode: number }) => void) => {
    const handler = (_: unknown, payload: { worktreeSessionId: string; exitCode: number }) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.WORKTREE_PTY_EXIT, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.WORKTREE_PTY_EXIT, handler); };
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
