import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Prompt } from '../../shared/types';

export function usePromptLibrary() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await window.api.getPrompts();
      setPrompts(result || []);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (prompt: Partial<Prompt> & { title: string; content: string }) => {
    try {
      const saved = await window.api.savePrompt(prompt);
      setPrompts((prev) => {
        const existing = prev.findIndex((p) => p.id === saved.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = saved;
          return updated;
        }
        return [saved, ...prev];
      });
      return saved;
    } catch {
      return null;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await window.api.deletePrompt(id);
      setPrompts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // Silently fail
    }
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    setPrompts((prev) => {
      const target = prev.find((p) => p.id === id);
      if (!target) return prev;
      const updated = { ...target, isFavorite: !target.isFavorite };
      // Fire and forget
      window.api.savePrompt(updated);
      return prev.map((p) => (p.id === id ? updated : p));
    });
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    prompts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    let result = prompts;

    if (showFavoritesOnly) {
      result = result.filter((p) => p.isFavorite);
    }

    if (selectedCategory !== 'All') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [prompts, searchQuery, selectedCategory, showFavoritesOnly]);

  return {
    prompts,
    filteredPrompts,
    categories,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    showFavoritesOnly,
    setShowFavoritesOnly,
    save,
    remove,
    toggleFavorite,
  };
}
