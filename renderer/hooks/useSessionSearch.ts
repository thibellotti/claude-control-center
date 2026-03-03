import { useState, useCallback, useRef } from 'react';
import type { SessionSearchResult } from '../../shared/types';

export function useSessionSearch() {
  const [results, setResults] = useState<SessionSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (q: string, opts?: { isRegex?: boolean; projectPath?: string }) => {
      setQuery(q);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!q.trim()) {
        setResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await window.api.searchSessions({
            query: q,
            isRegex: opts?.isRegex ?? isRegex,
            projectPath: opts?.projectPath,
          });
          setResults(res || []);
        } catch {
          setResults([]);
        } finally {
          setSearching(false);
        }
      }, 300);
    },
    [isRegex]
  );

  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setQuery('');
    setResults([]);
    setSearching(false);
  }, []);

  return {
    results,
    searching,
    query,
    isRegex,
    setIsRegex,
    search,
    clear,
  };
}
