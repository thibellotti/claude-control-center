import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ComponentInfo } from '../../shared/types';

export function useComponentGallery(projectPath: string) {
  const [components, setComponents] = useState<ComponentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null);

  // Scan components on mount
  const scan = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.scanComponents(projectPath);
      setComponents(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan components');
      setComponents([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await window.api.scanComponents(projectPath);
        if (!cancelled) {
          setComponents(result || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to scan components');
          setComponents([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  // Unique directory list sorted alphabetically
  const directories = useMemo(() => {
    const dirs = new Set(components.map((c) => c.directory));
    return Array.from(dirs).sort((a, b) => a.localeCompare(b));
  }, [components]);

  // Filtered components based on search and directory filter
  const filteredComponents = useMemo(() => {
    let filtered = components;

    if (selectedDirectory) {
      filtered = filtered.filter((c) => c.directory === selectedDirectory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.relativePath.toLowerCase().includes(query) ||
          c.props.some((p) => p.name.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [components, searchQuery, selectedDirectory]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: components.length,
      withTests: components.filter((c) => c.hasTests).length,
      withoutTests: components.filter((c) => !c.hasTests).length,
    };
  }, [components]);

  return {
    components: filteredComponents,
    allComponents: components,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectedDirectory,
    setSelectedDirectory,
    directories,
    stats,
    rescan: scan,
  };
}
