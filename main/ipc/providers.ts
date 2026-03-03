import { ipcMain, safeStorage } from 'electron';
import Store from 'electron-store';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { IPC_CHANNELS } from '../../shared/types';
import type { ProviderConfig, ProviderId } from '../../shared/provider-types';
import { DEFAULT_PROVIDERS } from '../../shared/provider-types';
import { log } from '../helpers/logger';

const execFileAsync = promisify(execFile);

const store = new Store({
  name: 'providers',
  defaults: {
    providers: DEFAULT_PROVIDERS,
    defaultProviderId: 'claude' as ProviderId,
    apiKeys: {} as Record<string, string>, // encrypted base64 strings
  },
});

// ---------------------------------------------------------------------------
// Helpers (exported for use by agents/worktrees)
// ---------------------------------------------------------------------------

export function getProvider(id: ProviderId): ProviderConfig {
  const providers = store.get('providers') as ProviderConfig[];
  const found = providers.find((p) => p.id === id);
  if (found) return found;
  // Fallback to default
  const def = DEFAULT_PROVIDERS.find((p) => p.id === id);
  if (def) return def;
  throw new Error(`Unknown provider: ${id}`);
}

export function getDefaultProvider(): ProviderConfig {
  const defaultId = store.get('defaultProviderId') as ProviderId;
  return getProvider(defaultId);
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerProviderHandlers() {
  // GET_ALL: return all providers + the default id
  ipcMain.handle(IPC_CHANNELS.PROVIDER_GET_ALL, async () => {
    const providers = store.get('providers') as ProviderConfig[];
    const defaultProviderId = store.get('defaultProviderId') as ProviderId;
    return { providers, defaultProviderId };
  });

  // SAVE: update a single provider config
  ipcMain.handle(IPC_CHANNELS.PROVIDER_SAVE, async (_, config: ProviderConfig) => {
    const providers = store.get('providers') as ProviderConfig[];
    const idx = providers.findIndex((p) => p.id === config.id);
    if (idx >= 0) {
      providers[idx] = config;
    } else {
      providers.push(config);
    }
    store.set('providers', providers);
    log('info', 'providers', `Saved provider config: ${config.id}`);
    return providers;
  });

  // DELETE: reset a provider to its default config
  ipcMain.handle(IPC_CHANNELS.PROVIDER_DELETE, async (_, id: ProviderId) => {
    const providers = store.get('providers') as ProviderConfig[];
    const defaultConfig = DEFAULT_PROVIDERS.find((p) => p.id === id);
    if (defaultConfig) {
      const idx = providers.findIndex((p) => p.id === id);
      if (idx >= 0) {
        providers[idx] = { ...defaultConfig };
      }
      store.set('providers', providers);
    }
    log('info', 'providers', `Reset provider to default: ${id}`);
    return store.get('providers') as ProviderConfig[];
  });

  // SET_DEFAULT: mark a provider as the default
  ipcMain.handle(IPC_CHANNELS.PROVIDER_SET_DEFAULT, async (_, id: ProviderId) => {
    store.set('defaultProviderId', id);
    log('info', 'providers', `Set default provider: ${id}`);
    return id;
  });

  // DETECT: check which CLIs are installed via `which`
  ipcMain.handle(IPC_CHANNELS.PROVIDER_DETECT, async () => {
    const providers = store.get('providers') as ProviderConfig[];

    for (const provider of providers) {
      const executable = provider.executablePath || provider.executable;
      try {
        await execFileAsync('which', [executable]);
        provider.isInstalled = true;
      } catch {
        provider.isInstalled = false;
      }
    }

    store.set('providers', providers);
    log('info', 'providers', `Detection complete: ${providers.map((p) => `${p.id}=${p.isInstalled}`).join(', ')}`);
    return providers;
  });

  // SET_API_KEY: encrypt and store an API key
  ipcMain.handle(IPC_CHANNELS.PROVIDER_SET_API_KEY, async (_, id: ProviderId, key: string) => {
    const apiKeys = store.get('apiKeys') as Record<string, string>;
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(key);
      apiKeys[id] = encrypted.toString('base64');
    } else {
      // Fallback: store as base64 (not truly encrypted)
      apiKeys[id] = Buffer.from(key).toString('base64');
    }
    store.set('apiKeys', apiKeys);
    log('info', 'providers', `API key stored for provider: ${id}`);
    return true;
  });

  // GET_API_KEY: decrypt and return an API key
  ipcMain.handle(IPC_CHANNELS.PROVIDER_GET_API_KEY, async (_, id: ProviderId) => {
    const apiKeys = store.get('apiKeys') as Record<string, string>;
    const stored = apiKeys[id];
    if (!stored) return null;

    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(stored, 'base64');
        return safeStorage.decryptString(buffer);
      } catch {
        return null;
      }
    } else {
      return Buffer.from(stored, 'base64').toString('utf-8');
    }
  });
}
