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
  onProjectUpdated: (callback: (data: { refresh?: boolean } | Record<string, unknown>) => void) => {
    ipcRenderer.on('project-updated', (_, project) => callback(project));
    return () => { ipcRenderer.removeAllListeners('project-updated'); };
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
