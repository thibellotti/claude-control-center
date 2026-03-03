import { useState, useEffect, useCallback } from 'react';
import type { ClientWorkspace } from '../../shared/client-types';

export function useClients() {
  const [clients, setClients] = useState<ClientWorkspace[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await window.api.getClients();
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveClient = useCallback(async (client: ClientWorkspace) => {
    const updated = await window.api.saveClient(client);
    setClients(updated);
    return updated;
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    const updated = await window.api.deleteClient(clientId);
    setClients(updated);
    return updated;
  }, []);

  return { clients, loading, saveClient, deleteClient, refresh };
}
