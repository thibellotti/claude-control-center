import { useState, useEffect, useCallback } from 'react';
import type { ClientWorkspace } from '../../shared/client-types';

export function useClients() {
  const [clients, setClients] = useState<ClientWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await window.api.getClients();
      setClients(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load clients:', err);
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveClient = useCallback(async (client: ClientWorkspace) => {
    try {
      const updated = await window.api.saveClient(client);
      setClients(updated);
      setError(null);
      return updated;
    } catch (err) {
      console.error('Failed to save client:', err);
      setError('Failed to save client');
      return null;
    }
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    try {
      const updated = await window.api.deleteClient(clientId);
      setClients(updated);
      setError(null);
      return updated;
    } catch (err) {
      console.error('Failed to delete client:', err);
      setError('Failed to delete client');
      return null;
    }
  }, []);

  return { clients, loading, error, saveClient, deleteClient, refresh };
}
