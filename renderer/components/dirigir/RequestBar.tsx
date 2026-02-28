import React, { useState, useRef, useEffect, useCallback } from 'react';

interface RequestBarProps {
  onSubmit: (prompt: string) => void;
  isProcessing: boolean;
  activeRequestPrompt?: string;
}

const RequestBar = React.memo(function RequestBar({
  onSubmit,
  isProcessing,
  activeRequestPrompt,
}: RequestBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K toggle
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Escape to collapse
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      } else if (e.key === 'Enter' && prompt.trim() && !isProcessing) {
        e.preventDefault();
        onSubmit(prompt.trim());
        setPrompt('');
        setIsOpen(false);
      }
    },
    [prompt, isProcessing, onSubmit]
  );

  const handleSubmit = useCallback(() => {
    if (!prompt.trim() || isProcessing) return;
    onSubmit(prompt.trim());
    setPrompt('');
    setIsOpen(false);
  }, [prompt, isProcessing, onSubmit]);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[600px] z-40">
      <div className="bg-surface-1/95 backdrop-blur-xl border border-border-default rounded-card shadow-lg">
        {/* Processing status */}
        {isProcessing && (
          <div className="flex items-center gap-2 px-4 py-2.5 text-sm">
            <span className="shrink-0 w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-text-secondary truncate flex-1">
              {activeRequestPrompt || 'Processing...'}
            </span>
            <span className="shrink-0 text-xs text-text-tertiary">
              Working...
            </span>
          </div>
        )}

        {/* Collapsed trigger */}
        {!isOpen && !isProcessing && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-text-tertiary text-sm cursor-pointer"
          >
            <span className="flex-1 text-left">
              Describe what you want to change...
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface-3 border border-border-subtle text-micro font-mono text-text-tertiary">
              {'\u2318'}K
            </kbd>
          </button>
        )}

        {/* Expanded input mode */}
        {isOpen && !isProcessing && (
          <div onKeyDown={handleKeyDown}>
            {/* Text input */}
            <div className="px-4 py-3">
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Make the pricing cards have rounded corners..."
                className="w-full bg-transparent text-sm text-text-primary outline-none placeholder-text-tertiary"
              />
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border-subtle">
              {/* Attachment placeholders */}
              <div className="flex items-center gap-1.5">
                <button className="px-2 py-1 rounded-button text-micro text-text-tertiary hover:text-text-secondary hover:bg-surface-2 transition-colors">
                  Figma
                </button>
                <button className="px-2 py-1 rounded-button text-micro text-text-tertiary hover:text-text-secondary hover:bg-surface-2 transition-colors">
                  URL
                </button>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                Go
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default RequestBar;
