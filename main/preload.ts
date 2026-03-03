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

  // Client Workspaces
  getClients: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CLIENTS),
  saveClient: (client: any) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_CLIENT, client),
  deleteClient: (clientId: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_CLIENT, clientId),
  seedClientsFromProjects: (projects: { client?: string | null }[]) => ipcRenderer.invoke(IPC_CHANNELS.SEED_CLIENTS_FROM_PROJECTS, projects),

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
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
