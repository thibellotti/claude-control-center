import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { IPC_CHANNELS, Workspace } from '../../shared/types';

const STUDIO_DIR = path.join(os.homedir(), '.claude', 'studio');
const WORKSPACES_FILE = path.join(STUDIO_DIR, 'workspaces.json');

async function ensureFile(): Promise<void> {
  await fs.mkdir(STUDIO_DIR, { recursive: true });
  try {
    await fs.access(WORKSPACES_FILE);
  } catch {
    await fs.writeFile(WORKSPACES_FILE, '[]', 'utf-8');
  }
}

async function readAll(): Promise<Workspace[]> {
  await ensureFile();
  try {
    const raw = await fs.readFile(WORKSPACES_FILE, 'utf-8');
    return JSON.parse(raw) as Workspace[];
  } catch {
    return [];
  }
}

async function writeAll(workspaces: Workspace[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(WORKSPACES_FILE, JSON.stringify(workspaces, null, 2), 'utf-8');
}

function generateId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function registerWorkspaceHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_WORKSPACES, async () => {
    return await readAll();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_WORKSPACE, async (_, workspace: Workspace) => {
    const workspaces = await readAll();
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

    await writeAll(workspaces);
    return toSave;
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_WORKSPACE, async (_, id: string) => {
    const workspaces = await readAll();
    const filtered = workspaces.filter((w) => w.id !== id);
    if (filtered.length !== workspaces.length) {
      await writeAll(filtered);
      return true;
    }
    return false;
  });
}
