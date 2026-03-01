import { ipcMain, shell, safeStorage } from 'electron';
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

/** On-disk format: apiKey may be stored as encryptedApiKey (base64 of encrypted buffer) */
interface AccountOnDisk {
  encryptedApiKey?: string;
  apiKey?: string;
  plan?: string;
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

function encryptApiKey(apiKey: string): string | null {
  if (!apiKey) return null;
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(apiKey);
      return encrypted.toString('base64');
    }
  } catch (error: unknown) {
    log('warn', 'account', 'safeStorage encryption failed, falling back to plaintext', error);
  }
  return null;
}

function decryptApiKey(encryptedBase64: string): string {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(encryptedBase64, 'base64');
      return safeStorage.decryptString(buffer);
    }
  } catch (error: unknown) {
    log('warn', 'account', 'safeStorage decryption failed', error);
  }
  return '';
}

async function loadAccount(): Promise<AccountConfig> {
  try {
    const data = await fs.readFile(ACCOUNT_FILE, 'utf-8');
    const raw: AccountOnDisk = JSON.parse(data);

    let apiKey = '';
    if (raw.encryptedApiKey) {
      apiKey = decryptApiKey(raw.encryptedApiKey);
    } else if (raw.apiKey) {
      // Legacy plaintext — use it, will be re-encrypted on next save
      apiKey = raw.apiKey;
    }

    return {
      ...DEFAULT_CONFIG,
      apiKey,
      plan: (raw.plan as AccountConfig['plan']) || 'free',
      email: raw.email,
      licenseKey: raw.licenseKey,
      activatedAt: raw.activatedAt,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function saveAccount(config: AccountConfig) {
  await ensureDir();
  const onDisk: AccountOnDisk = {
    plan: config.plan,
    email: config.email,
    licenseKey: config.licenseKey,
    activatedAt: config.activatedAt,
  };

  const encrypted = encryptApiKey(config.apiKey);
  if (encrypted) {
    onDisk.encryptedApiKey = encrypted;
  } else {
    // Fallback: store plaintext if encryption not available
    onDisk.apiKey = config.apiKey;
  }

  await fs.writeFile(ACCOUNT_FILE, JSON.stringify(onDisk, null, 2), 'utf-8');
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
