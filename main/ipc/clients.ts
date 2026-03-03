import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { IPC_CHANNELS } from '../../shared/types';
import type { ClientWorkspace } from '../../shared/client-types';

const FORMA_DIR = join(homedir(), '.forma');
const CLIENTS_FILE = join(FORMA_DIR, 'clients.json');

async function ensureDir() {
  await fs.mkdir(FORMA_DIR, { recursive: true });
}

async function loadClients(): Promise<ClientWorkspace[]> {
  await ensureDir();
  try {
    const data = await fs.readFile(CLIENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveClients(clients: ClientWorkspace[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(CLIENTS_FILE, JSON.stringify(clients, null, 2), 'utf-8');
}

export function registerClientHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_CLIENTS, async () => {
    return loadClients();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_CLIENT, async (_, client: ClientWorkspace) => {
    const clients = await loadClients();
    const idx = clients.findIndex(c => c.id === client.id);
    if (idx >= 0) {
      clients[idx] = { ...client, updatedAt: Date.now() };
    } else {
      clients.push({
        ...client,
        id: client.id || uuidv4(),
        createdAt: client.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
    }
    await saveClients(clients);
    return clients;
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_CLIENT, async (_, clientId: string) => {
    const clients = await loadClients();
    const filtered = clients.filter(c => c.id !== clientId);
    await saveClients(filtered);
    return filtered;
  });

  ipcMain.handle(IPC_CHANNELS.SEED_CLIENTS_FROM_PROJECTS, async (_, projects: { client?: string | null }[]) => {
    const existing = await loadClients();
    if (existing.length > 0) return existing;

    const clientNames = new Set<string>();
    for (const p of projects) {
      if (p.client) clientNames.add(p.client);
    }

    const seeded: ClientWorkspace[] = [];
    for (const name of clientNames) {
      seeded.push({
        id: uuidv4(),
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    if (seeded.length > 0) {
      await saveClients(seeded);
    }
    return seeded;
  });
}
