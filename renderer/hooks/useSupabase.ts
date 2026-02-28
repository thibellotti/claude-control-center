import { useState, useEffect, useCallback } from 'react';

export interface SupabaseInfo {
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

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.api.getSupabaseInfo(projectPath);
      setInfo(result as SupabaseInfo);
    } catch {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  return { info, loading, refresh: fetchInfo };
}
