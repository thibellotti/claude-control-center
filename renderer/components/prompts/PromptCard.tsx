import React, { useState, useCallback } from 'react';
import type { Prompt } from '../../../shared/types';

interface PromptCardProps {
  prompt: Prompt;
  onEdit: (prompt: Prompt) => void;
  onToggleFavorite: (id: string) => void;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7 1.5l1.64 3.32 3.66.54-2.65 2.58.63 3.64L7 9.77l-3.28 1.81.63-3.64L1.7 5.36l3.66-.54L7 1.5z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M9.5 4.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8.5 2.5l3 3M2 9.5l6.5-6.5 3 3L5 12.5H2v-3z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PromptCard({ prompt, onEdit, onToggleFavorite }: PromptCardProps) {
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
              ? 'text-yellow-400 hover:text-yellow-300'
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
        <span className="px-2 py-0.5 rounded-full bg-surface-3 text-[10px] font-medium text-text-secondary">
          {prompt.category}
        </span>
        {prompt.tags.length > 0 && (
          <span className="text-[10px] text-text-tertiary truncate">
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
          <EditIcon />
          <span>Edit</span>
        </button>
      </div>
    </div>
  );
}
