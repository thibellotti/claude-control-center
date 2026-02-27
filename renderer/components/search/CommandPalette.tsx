import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { CommandResult } from '../../hooks/useCommandPalette';

interface CommandPaletteProps {
  open: boolean;
  query: string;
  results: CommandResult[];
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onSelect: (result: CommandResult) => void;
}

// Type icons
const TYPE_ICONS: Record<CommandResult['type'], string> = {
  project: '\u25C6', // filled diamond
  task: '\u25C7',    // hollow diamond
  plan: '\u25A4',    // square with grid
};

const TYPE_LABELS: Record<CommandResult['type'], string> = {
  project: 'Project',
  task: 'Task',
  plan: 'Plan',
};

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function CommandPalette({
  open,
  query,
  results,
  onQueryChange,
  onClose,
  onSelect,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Auto-focus input on open
  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
      // Slight delay to ensure DOM is ready
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : results.length - 1
        );
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        onSelect(results[selectedIndex]);
        onClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [results, selectedIndex, onSelect, onClose]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center px-4" style={{ paddingTop: '20vh' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Palette */}
      <div
        className="relative w-full max-w-[560px] max-h-[400px] bg-surface-1 border border-border-subtle rounded-card shadow-2xl flex flex-col overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
          <span className="text-text-tertiary">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search projects, tasks, plans..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-surface-3 border border-border-subtle text-[10px] font-mono text-text-tertiary">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {query && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-text-tertiary">
                No results for &apos;{query}&apos;
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={`${result.type}-${result.title}-${index}`}
                    onClick={() => {
                      onSelect(result);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-surface-3' : 'hover:bg-surface-2'
                    }`}
                  >
                    {/* Type icon */}
                    <span className="shrink-0 w-5 text-center text-text-tertiary text-sm">
                      {TYPE_ICONS[result.type]}
                    </span>

                    {/* Title and subtitle */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">
                        {result.title}
                      </p>
                      <p className="text-[11px] text-text-tertiary truncate">
                        {result.subtitle}
                      </p>
                    </div>

                    {/* Type label */}
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
                      {TYPE_LABELS[result.type]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!query && (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-text-tertiary">
                Type to search across projects, tasks, and plans
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
