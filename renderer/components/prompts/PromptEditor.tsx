import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Prompt } from '../../../shared/types';

interface PromptEditorProps {
  prompt: Prompt | null; // null = create new
  categories: string[];
  onSave: (prompt: Partial<Prompt> & { title: string; content: string }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export default function PromptEditor({
  prompt,
  categories,
  onSave,
  onDelete,
  onClose,
}: PromptEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setContent(prompt.content);
      setCategory(prompt.category);
      setTagsInput(prompt.tags.join(', '));
    } else {
      setTitle('');
      setContent('');
      setCategory('');
      setTagsInput('');
    }
  }, [prompt]);

  useEffect(() => {
    // Focus title input on mount
    setTimeout(() => titleRef.current?.focus(), 100);
  }, []);

  const handleSave = useCallback(() => {
    if (!title.trim() || !content.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      ...(prompt || {}),
      title: title.trim(),
      content: content.trim(),
      category: category.trim() || 'Uncategorized',
      tags,
    });
    onClose();
  }, [title, content, category, tagsInput, prompt, onSave, onClose]);

  const handleDelete = useCallback(() => {
    if (prompt && onDelete) {
      onDelete(prompt.id);
      onClose();
    }
  }, [prompt, onDelete, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSave();
      }
    },
    [onClose, handleSave]
  );

  const isEditing = !!prompt;
  const canSave = title.trim().length > 0 && content.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-lg mx-4 bg-surface-1 border border-border-subtle rounded-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">
            {isEditing ? 'Edit Prompt' : 'Create Prompt'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1.5">
              Title
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Prompt title..."
              className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border-subtle text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1.5">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Development, Debugging..."
              list="prompt-categories"
              className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border-subtle text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
            />
            <datalist id="prompt-categories">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Content */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1.5">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your prompt template here..."
              rows={6}
              className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border-subtle text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors resize-y font-mono leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1.5">
              Tags
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Comma-separated tags..."
              className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border-subtle text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
            />
            <p className="text-[10px] text-text-tertiary mt-1">
              Separate multiple tags with commas
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle">
          <div>
            {isEditing && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">Delete this prompt?</span>
                    <button
                      onClick={handleDelete}
                      className="px-2.5 py-1 rounded-button text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 rounded-button text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-2.5 py-1 rounded-button text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-button text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-1.5 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
