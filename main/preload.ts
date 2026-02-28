import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

const api = {
  getProjects: () => ipcRenderer.invoke('get-projects'),
  getProjectDetail: (path: string) => ipcRenderer.invoke('get-project-detail', path),
  getClaudeSettings: () => ipcRenderer.invoke('get-claude-settings'),
  getSessions: (projectPath?: string) => ipcRenderer.invoke('get-sessions', projectPath),
  openInTerminal: (path: string) => ipcRenderer.invoke('open-in-terminal', path),
  openInEditor: (path: string) => ipcRenderer.invoke('open-in-editor', path),
  openInFinder: (path: string) => ipcRenderer.invoke('open-in-finder', path),
  refreshProjects: () => ipcRenderer.invoke('refresh-projects'),
  getActiveSessions: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ACTIVE_SESSIONS),
  launchClaude: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_CLAUDE, path),
  readFile: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke(IPC_CHANNELS.WRITE_FILE, filePath, content),
  getPrompts: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PROMPTS),
  savePrompt: (prompt: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_PROMPT, prompt),
  deletePrompt: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_PROMPT, id),
  startDevServer: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.START_DEV_SERVER, projectPath),
  stopDevServer: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.STOP_DEV_SERVER, projectPath),
  getDevServerStatus: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_DEV_SERVER_STATUS, projectPath),
  getWorkspaces: () => ipcRenderer.invoke(IPC_CHANNELS.GET_WORKSPACES),
  saveWorkspace: (workspace: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_WORKSPACE, workspace),
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
  saveFigmaLink: (projectId: string, link: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_FIGMA_LINK, projectId, link),
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
  onPreviewStatusUpdate: (callback: (state: unknown) => void) => {
    const handler = (_: unknown, payload: unknown) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.PREVIEW_STATUS_UPDATE, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.PREVIEW_STATUS_UPDATE, handler); };
  },
  previewStartWatching: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.PREVIEW_START_WATCHING, projectPath),
  previewStopWatching: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.PREVIEW_STOP_WATCHING, projectPath),

  // Request System (Forma)
  createRequest: (data: { projectId: string; projectPath: string; prompt: string; attachments?: unknown[] }) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_REQUEST, data),
  getRequests: (projectId?: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_REQUESTS, projectId),
  cancelRequest: (requestId: string) => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_REQUEST, requestId),
  approveRequest: (requestId: string) => ipcRenderer.invoke(IPC_CHANNELS.APPROVE_REQUEST, requestId),
  rejectRequest: (requestId: string) => ipcRenderer.invoke(IPC_CHANNELS.REJECT_REQUEST, requestId),
  onRequestStatusUpdate: (callback: (request: unknown) => void) => {
    const handler = (_: unknown, data: unknown) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.REQUEST_STATUS_UPDATE, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.REQUEST_STATUS_UPDATE, handler); };
  },
  onRequestFeedUpdate: (callback: (entry: unknown) => void) => {
    const handler = (_: unknown, data: unknown) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.REQUEST_FEED_UPDATE, handler);
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.REQUEST_FEED_UPDATE, handler); };
  },

  getProjectPages: (projectPath: string) => ipcRenderer.invoke('get-project-pages', projectPath),

  getTemplates: () => ipcRenderer.invoke('get-templates'),
  createFromTemplate: (opts: { templateId: string; projectName: string; parentDir?: string }) =>
    ipcRenderer.invoke('create-from-template', opts),
  pickDirectory: () => ipcRenderer.invoke('pick-directory'),

  getAccount: () => ipcRenderer.invoke('get-account'),
  saveAccount: (updates: Record<string, unknown>) => ipcRenderer.invoke('save-account', updates),
  getPlanLimits: () => ipcRenderer.invoke('get-plan-limits'),
  openBillingPortal: () => ipcRenderer.invoke('open-billing-portal'),

  onProjectUpdated: (callback: (data: { refresh?: boolean } | Record<string, unknown>) => void) => {
    ipcRenderer.on('project-updated', (_, project) => callback(project));
    return () => { ipcRenderer.removeAllListeners('project-updated'); };
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
