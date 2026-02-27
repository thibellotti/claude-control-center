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
  onProjectUpdated: (callback: (data: { refresh?: boolean } | Record<string, unknown>) => void) => {
    ipcRenderer.on('project-updated', (_, project) => callback(project));
    return () => { ipcRenderer.removeAllListeners('project-updated'); };
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
