import { useState, useEffect, useCallback } from 'react';

interface SupabaseInfo {
  hasSupabase: boolean;
  envVars: {
    hasUrl: boolean;
    hasAnonKey: boolean;
    hasServiceKey: boolean;
  };
  hasLocalConfig: boolean;
  projectUrl: string | null;
}

export function useSupabase(projectPath: string) {
  const [info, setInfo] = useState<SupabaseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.api.getSupabaseInfo(projectPath);
      setInfo(result);
    } catch {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await window.api.getSupabaseInfo(projectPath);
        if (!cancelled) setInfo(result);
      } catch {
        if (!cancelled) setInfo(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [projectPath]);

  return { info, loading, refresh: fetch };
}
