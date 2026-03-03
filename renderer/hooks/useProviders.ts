import { useState, useEffect, useCallback } from 'react';
import type { ProviderConfig, ProviderId } from '../../shared/provider-types';

export function useProviders() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [defaultProviderId, setDefaultProviderId] = useState<ProviderId>('claude');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await window.api.getProviders();
      setProviders(result.providers);
      setDefaultProviderId(result.defaultProviderId);
      setError(null);
    } catch (err) {
      console.error('Failed to load providers:', err);
      setError('Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const saveProvider = useCallback(async (config: ProviderConfig) => {
    try {
      const updated = await window.api.saveProvider(config);
      setProviders(updated);
      setError(null);
      return updated;
    } catch (err) {
      console.error('Failed to save provider:', err);
      setError('Failed to save provider');
      return null;
    }
  }, []);

  const deleteProvider = useCallback(async (id: ProviderId) => {
    try {
      const updated = await window.api.deleteProvider(id);
      setProviders(updated);
      setError(null);
      return updated;
    } catch (err) {
      console.error('Failed to reset provider:', err);
      setError('Failed to reset provider');
      return null;
    }
  }, []);

  const setDefault = useCallback(async (id: ProviderId) => {
    try {
      await window.api.setDefaultProvider(id);
      setDefaultProviderId(id);
      setError(null);
    } catch (err) {
      console.error('Failed to set default provider:', err);
      setError('Failed to set default provider');
    }
  }, []);

  const detectAll = useCallback(async () => {
    try {
      const updated = await window.api.detectProviders();
      setProviders(updated);
      setError(null);
      return updated;
    } catch (err) {
      console.error('Failed to detect providers:', err);
      setError('Failed to detect providers');
      return null;
    }
  }, []);

  const setApiKey = useCallback(async (id: ProviderId, key: string) => {
    try {
      await window.api.setProviderApiKey(id, key);
      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to set API key:', err);
      setError('Failed to set API key');
      return false;
    }
  }, []);

  const getApiKey = useCallback(async (id: ProviderId): Promise<string | null> => {
    try {
      return await window.api.getProviderApiKey(id);
    } catch (err) {
      console.error('Failed to get API key:', err);
      return null;
    }
  }, []);

  return {
    providers,
    defaultProviderId,
    loading,
    error,
    refresh,
    saveProvider,
    deleteProvider,
    setDefault,
    detectAll,
    setApiKey,
    getApiKey,
  };
}
