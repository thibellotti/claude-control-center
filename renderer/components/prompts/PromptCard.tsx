import React, { memo, useState, useCallback } from 'react';
import type { Prompt } from '../../../shared/types';
import { StarIcon, CopyIcon, PencilIcon } from '../icons';

interface PromptCardProps {
  prompt: Prompt;
  onEdit: (prompt: Prompt) => void;
  onToggleFavorite: (id: string) => void;
}

export default memo(function PromptCard({ prompt, onEdit, onToggleFavorite }: PromptCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(prompt.content);
      } catch {
        // Fallback for environments where clipboard API is unavailable
        const textarea = document.createElement('textarea');
        textarea.value = prompt.content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [prompt.content]
  );

  return (
    <div className="group relative bg-surface-1 border border-border-subtle rounded-card p-4 hover:border-accent/40 transition-all duration-200">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-text-primary truncate flex-1">
          {prompt.title}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(prompt.id);
          }}
          className={`shrink-0 p-1 rounded-button transition-colors ${
            prompt.isFavorite
              ? 'text-feedback-warning hover:text-feedback-warning'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
          aria-label={prompt.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          title={prompt.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <StarIcon filled={prompt.isFavorite} />
        </button>
      </div>

      {/* Content preview */}
      <p className="text-xs text-text-tertiary line-clamp-2 mb-3 leading-relaxed">
        {prompt.content}
      </p>

      {/* Category pill */}
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 rounded-full bg-surface-3 text-micro font-medium text-text-secondary">
          {prompt.category}
        </span>
        {prompt.tags.length > 0 && (
          <span className="text-micro text-text-tertiary truncate">
            {prompt.tags.join(', ')}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-button text-[11px] text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors"
          title="Copy to clipboard"
        >
          <CopyIcon />
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(prompt);
          }}
          className="flex items-center gap-1.5 px-2 py-1 rounded-button text-[11px] text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors"
          title="Edit prompt"
        >
          <PencilIcon />
          <span>Edit</span>
        </button>
      </div>
    </div>
  );
})
