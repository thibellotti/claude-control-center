import { useState, useEffect } from 'react';
import type { ClaudeSettings, SessionEntry } from '../../shared/types';

export function useSettings() {
  const [settings, setSettings] = useState<ClaudeSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await window.api.getClaudeSettings();
        setSettings(result);
      } catch {
        // Silently fail — settings might not exist
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { settings, loading };
}

export function useSessions(projectPath?: string) {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await window.api.getSessions(projectPath);
        setSessions(result || []);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectPath]);

  return { sessions, loading };
}
