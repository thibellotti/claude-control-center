import { ipcMain } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import os from 'os';
import { IPC_CHANNELS, Workspace } from '../../shared/types';

const STUDIO_DIR = path.join(os.homedir(), '.claude', 'studio');
const WORKSPACES_FILE = path.join(STUDIO_DIR, 'workspaces.json');

function ensureFile(): void {
  if (!existsSync(STUDIO_DIR)) {
    mkdirSync(STUDIO_DIR, { recursive: true });
  }
  if (!existsSync(WORKSPACES_FILE)) {
    writeFileSync(WORKSPACES_FILE, '[]', 'utf-8');
  }
}

function readAll(): Workspace[] {
  ensureFile();
  try {
    const raw = readFileSync(WORKSPACES_FILE, 'utf-8');
    return JSON.parse(raw) as Workspace[];
  } catch {
    return [];
  }
}

function writeAll(workspaces: Workspace[]): void {
  ensureFile();
  writeFileSync(WORKSPACES_FILE, JSON.stringify(workspaces, null, 2), 'utf-8');
}

function generateId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function registerWorkspaceHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_WORKSPACES, async () => {
    return readAll();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_WORKSPACE, async (_, workspace: Workspace) => {
    const workspaces = readAll();
    const now = Date.now();

    const toSave: Workspace = {
      ...workspace,
      id: workspace.id || generateId(),
      createdAt: workspace.createdAt || now,
      updatedAt: now,
    };

    const existingIndex = workspaces.findIndex((w) => w.id === toSave.id);
    if (existingIndex >= 0) {
      workspaces[existingIndex] = toSave;
    } else {
      workspaces.push(toSave);
    }

    writeAll(workspaces);
    return toSave;
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_WORKSPACE, async (_, id: string) => {
    const workspaces = readAll();
    const filtered = workspaces.filter((w) => w.id !== id);
    if (filtered.length !== workspaces.length) {
      writeAll(filtered);
      return true;
    }
    return false;
  });
}
