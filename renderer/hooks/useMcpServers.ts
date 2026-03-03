import { useState, useEffect, useCallback } from 'react';
import type { McpServerEntry, McpServerConfig } from '../../shared/types';

export function useMcpServers(projectPath?: string) {
  const [servers, setServers] = useState<McpServerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await window.api.getMcpServers(projectPath);
      setServers(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load MCP servers:', err);
      setError('Failed to load MCP servers');
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => { refresh(); }, [refresh]);

  const addServer = useCallback(async (
    name: string,
    config: McpServerConfig,
    scope: 'global' | 'project',
  ) => {
    try {
      await window.api.addMcpServer({ name, config, scope, projectPath });
      await refresh();
      setError(null);
    } catch (err) {
      console.error('Failed to add MCP server:', err);
      setError('Failed to add MCP server');
    }
  }, [projectPath, refresh]);

  const removeServer = useCallback(async (name: string, scope: 'global' | 'project') => {
    try {
      await window.api.removeMcpServer({ name, scope, projectPath });
      await refresh();
      setError(null);
    } catch (err) {
      console.error('Failed to remove MCP server:', err);
      setError('Failed to remove MCP server');
    }
  }, [projectPath, refresh]);

  const testServer = useCallback(async (command: string, args?: string[]) => {
    try {
      const result = await window.api.testMcpServer({ command, args });
      return result as { status: 'ok' | 'error'; message?: string };
    } catch (err) {
      console.error('Failed to test MCP server:', err);
      return { status: 'error' as const, message: (err as Error).message };
    }
  }, []);

  return { servers, loading, error, addServer, removeServer, testServer, refresh };
}
