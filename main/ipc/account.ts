import { ipcMain, shell } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { log } from '../helpers/logger';

const HOME = os.homedir();
const CONFIG_DIR = path.join(HOME, '.claude', 'studio');
const ACCOUNT_FILE = path.join(CONFIG_DIR, 'account.json');

interface AccountConfig {
  apiKey: string;
  plan: 'free' | 'pro' | 'team';
  email?: string;
  licenseKey?: string;
  activatedAt?: number;
}

const DEFAULT_CONFIG: AccountConfig = {
  apiKey: '',
  plan: 'free',
};

async function ensureDir() {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
}

async function loadAccount(): Promise<AccountConfig> {
  try {
    const data = await fs.readFile(ACCOUNT_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function saveAccount(config: AccountConfig) {
  await ensureDir();
  await fs.writeFile(ACCOUNT_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function registerAccountHandlers() {
  ipcMain.handle('get-account', async () => {
    return loadAccount();
  });

  ipcMain.handle('save-account', async (_, updates: Partial<AccountConfig>) => {
    const current = await loadAccount();
    const updated = { ...current, ...updates };
    await saveAccount(updated);
    log('info', 'account', 'Account config updated');
    return updated;
  });

  ipcMain.handle('get-plan-limits', async () => {
    const account = await loadAccount();
    switch (account.plan) {
      case 'free':
        return { maxProjects: 1, canDeploy: false, hasFigmaBridge: false, hasDesignReplay: false };
      case 'pro':
        return { maxProjects: -1, canDeploy: true, hasFigmaBridge: true, hasDesignReplay: true };
      case 'team':
        return { maxProjects: -1, canDeploy: true, hasFigmaBridge: true, hasDesignReplay: true };
      default:
        return { maxProjects: 1, canDeploy: false, hasFigmaBridge: false, hasDesignReplay: false };
    }
  });

  ipcMain.handle('open-billing-portal', async () => {
    // For MVP, open Stripe payment link
    shell.openExternal('https://buy.stripe.com/placeholder');
  });
}
