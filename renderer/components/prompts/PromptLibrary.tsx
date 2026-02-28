import React, { useState, useCallback } from 'react';
import type { Prompt } from '../../../shared/types';
import { usePromptLibrary } from '../../hooks/usePromptLibrary';
import PromptCard from './PromptCard';
import PromptEditor from './PromptEditor';
import { SearchIcon, PlusIcon, StarIcon } from '../icons';

export default function PromptLibrary() {
  const {
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
  } = usePromptLibrary();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  const handleNewPrompt = useCallback(() => {
    setEditingPrompt(null);
    setEditorOpen(true);
  }, []);

  const handleEditPrompt = useCallback((prompt: Prompt) => {
    setEditingPrompt(prompt);
    setEditorOpen(true);
  }, []);

  const handleSave = useCallback(
    (prompt: Partial<Prompt> & { title: string; content: string }) => {
      save(prompt);
    },
    [save]
  );

  const handleDelete = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove]
  );

  const handleCloseEditor = useCallback(() => {
    setEditorOpen(false);
    setEditingPrompt(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-text-tertiary text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse" />
          Loading prompts...
        </div>
      </div>
    );
  }

  const allCategories = ['All', ...categories];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Prompt Library</h1>
          <p className="text-xs text-text-tertiary mt-0.5">
            Manage and organize your prompt templates
          </p>
        </div>
        <button
          onClick={handleNewPrompt}
          className="flex items-center gap-2 px-4 py-2 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          <PlusIcon />
          New Prompt
        </button>
      </div>

      {/* Filters bar */}
      <div className="space-y-3">
        {/* Search + favorites toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts..."
              className="w-full pl-9 pr-3 py-2 rounded-md bg-surface-1 border border-border-subtle text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-button text-xs font-medium border transition-colors ${
              showFavoritesOnly
                ? 'bg-feedback-warning-muted border-feedback-warning/30 text-feedback-warning'
                : 'bg-surface-1 border-border-subtle text-text-tertiary hover:text-text-secondary hover:border-border-default'
            }`}
            title="Show favorites only"
          >
            <StarIcon />
            Favorites
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {allCategories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'bg-surface-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-3'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {filteredPrompts.length > 0 ? (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {filteredPrompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onEdit={handleEditPrompt}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-text-tertiary text-sm">No prompts found.</p>
          {searchQuery || selectedCategory !== 'All' || showFavoritesOnly ? (
            <p className="text-text-tertiary text-xs mt-1">
              Try adjusting your filters or search query.
            </p>
          ) : (
            <p className="text-text-tertiary text-xs mt-1">
              Create your first prompt to get started.
            </p>
          )}
        </div>
      )}

      {/* Editor modal */}
      {editorOpen && (
        <PromptEditor
          prompt={editingPrompt}
          categories={categories}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
}
