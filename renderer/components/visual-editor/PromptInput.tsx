import React, { useState, useCallback } from 'react';
import type { SelectedElement, VisualAction } from '../../../shared/types';
import { SpinnerIcon } from '../icons';

interface PromptInputProps {
  selectedElement: SelectedElement | null;
  isApplying: boolean;
  onExecuteAction: (action: VisualAction) => void;
}

export default function PromptInput({ selectedElement, isApplying, onExecuteAction }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');

  const placeholder = selectedElement
    ? `Describe a change to <${selectedElement.reactComponent || selectedElement.tagName}>...`
    : 'Select an element first, or describe a page-level change';

  const handleSubmit = useCallback(() => {
    if (!prompt.trim() || isApplying) return;

    // Build element — use selected or create a dummy page-level element
    const element: SelectedElement = selectedElement || {
      selector: 'body',
      tagName: 'body',
      className: '',
      textContent: '',
      computedStyles: {},
      boundingRect: { x: 0, y: 0, width: 0, height: 0 },
      reactFiber: false,
    };

    const action: VisualAction = {
      id: crypto.randomUUID(),
      type: 'prompt',
      element,
      userPrompt: prompt.trim(),
    };

    onExecuteAction(action);
    setPrompt('');
  }, [prompt, isApplying, selectedElement, onExecuteAction]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="border-t border-border-subtle bg-surface-1 p-3 shrink-0">
      {/* Context label */}
      {selectedElement && (
        <div className="text-micro text-text-tertiary mb-2 truncate">
          Selected: <span className="text-accent font-mono">
            {'<'}{selectedElement.reactComponent || selectedElement.tagName}{'>'}
          </span>
          {selectedElement.sourceFile && (
            <span> in {selectedElement.sourceFile.split('/').pop()}</span>
          )}
        </div>
      )}

      {/* Textarea */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isApplying}
        rows={3}
        className="w-full px-3 py-2 rounded bg-surface-2 border border-border-subtle text-xs text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:border-accent disabled:opacity-50"
      />

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={isApplying || !prompt.trim()}
        className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-button text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isApplying ? (
          <>
            <SpinnerIcon size={14} />
            Applying...
          </>
        ) : (
          'Apply with Claude'
        )}
      </button>

      {/* Shortcut hint */}
      <p className="text-micro text-text-tertiary mt-1 text-center">Cmd+Enter to apply</p>
    </div>
  );
}
