import React, { useRef, useEffect, useState } from 'react';
import type { ClaudeMdBlock } from '../../../shared/types';
import { DragHandleIcon, ChevronUpIcon, ChevronDownIcon, CloseIcon, PlusIcon } from '../icons';

interface EditorBlockProps {
  block: ClaudeMdBlock;
  index: number;
  totalBlocks: number;
  onUpdate: (id: string, updates: Partial<ClaudeMdBlock>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
}

// Auto-resizing textarea
function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className={`w-full resize-none overflow-hidden bg-transparent focus:outline-none ${className || ''}`}
    />
  );
}

// Heading block
function HeadingBlock({
  block,
  onUpdate,
}: {
  block: ClaudeMdBlock;
  onUpdate: (updates: Partial<ClaudeMdBlock>) => void;
}) {
  const level = block.level || 1;
  const sizeClasses: Record<number, string> = {
    1: 'text-lg font-bold',
    2: 'text-base font-semibold',
    3: 'text-sm font-semibold',
    4: 'text-sm font-medium',
  };

  return (
    <div className="flex items-start gap-2">
      <select
        value={level}
        onChange={(e) => onUpdate({ level: parseInt(e.target.value) })}
        className="shrink-0 mt-0.5 bg-surface-2 border border-border-subtle rounded-button px-1.5 py-0.5 text-[11px] font-mono text-text-secondary focus:outline-none focus:border-accent cursor-pointer"
      >
        <option value={1}>H1</option>
        <option value={2}>H2</option>
        <option value={3}>H3</option>
        <option value={4}>H4</option>
      </select>
      <AutoTextarea
        value={block.content}
        onChange={(val) => onUpdate({ content: val })}
        placeholder="Heading text..."
        className={`${sizeClasses[level]} text-text-primary`}
      />
    </div>
  );
}

// Text block
function TextBlock({
  block,
  onUpdate,
}: {
  block: ClaudeMdBlock;
  onUpdate: (updates: Partial<ClaudeMdBlock>) => void;
}) {
  return (
    <AutoTextarea
      value={block.content}
      onChange={(val) => onUpdate({ content: val })}
      placeholder="Write something..."
      className="text-sm text-text-secondary leading-relaxed"
    />
  );
}

// List block
function ListBlock({
  block,
  onUpdate,
}: {
  block: ClaudeMdBlock;
  onUpdate: (updates: Partial<ClaudeMdBlock>) => void;
}) {
  const items = block.content ? block.content.split('\n') : [''];

  const updateItem = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onUpdate({ content: next.join('\n') });
  };

  const addItem = () => {
    onUpdate({ content: [...items, ''].join('\n') });
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    const next = items.filter((_, i) => i !== index);
    onUpdate({ content: next.join('\n') });
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = [...items];
      next.splice(index + 1, 0, '');
      onUpdate({ content: next.join('\n') });
      // Focus the new input on next tick
      setTimeout(() => {
        const container = (e.target as HTMLElement).closest('[data-list-block]');
        if (container) {
          const inputs = container.querySelectorAll('input[data-list-item]');
          const target = inputs[index + 1] as HTMLInputElement;
          if (target) target.focus();
        }
      }, 0);
    }
    if (e.key === 'Backspace' && items[index] === '' && items.length > 1) {
      e.preventDefault();
      removeItem(index);
      // Focus previous input
      setTimeout(() => {
        const container = (e.target as HTMLElement).closest('[data-list-block]');
        if (container) {
          const inputs = container.querySelectorAll('input[data-list-item]');
          const target = inputs[Math.max(0, index - 1)] as HTMLInputElement;
          if (target) target.focus();
        }
      }, 0);
    }
  };

  return (
    <div className="space-y-1" data-list-block>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2 group/item">
          <span className="text-text-tertiary text-sm shrink-0 select-none">-</span>
          <input
            data-list-item
            type="text"
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            placeholder="List item..."
            className="flex-1 bg-transparent text-sm text-text-secondary focus:outline-none placeholder:text-text-tertiary"
          />
          {items.length > 1 && (
            <button
              onClick={() => removeItem(index)}
              className="shrink-0 p-0.5 text-text-tertiary opacity-0 group-hover/item:opacity-100 hover:text-status-dirty transition-all"
              title="Remove item"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-accent transition-colors mt-1"
      >
        <PlusIcon />
        Add item
      </button>
    </div>
  );
}

// Code block
function CodeBlock({
  block,
  onUpdate,
}: {
  block: ClaudeMdBlock;
  onUpdate: (updates: Partial<ClaudeMdBlock>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${Math.max(ref.current.scrollHeight, 64)}px`;
    }
  }, [block.content]);

  return (
    <div className="bg-surface-3 border border-border-subtle rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle">
        <input
          type="text"
          value={block.language || ''}
          onChange={(e) => onUpdate({ language: e.target.value })}
          placeholder="language"
          className="bg-transparent text-[11px] font-mono text-text-tertiary focus:outline-none focus:text-text-secondary placeholder:text-text-tertiary w-24"
        />
      </div>
      <textarea
        ref={ref}
        value={block.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        placeholder="// Code here..."
        className="w-full resize-none bg-transparent p-3 text-[12px] font-mono text-text-secondary leading-relaxed focus:outline-none"
        rows={3}
        spellCheck={false}
      />
    </div>
  );
}

// Rule block (non-editable divider)
function RuleBlock() {
  return (
    <div className="py-2">
      <hr className="border-border-default" />
    </div>
  );
}

// Block type label
const BLOCK_TYPE_LABELS: Record<ClaudeMdBlock['type'], string> = {
  heading: 'Heading',
  text: 'Text',
  list: 'List',
  code: 'Code',
  rule: 'Divider',
};

export default function EditorBlock({
  block,
  index,
  totalBlocks,
  onUpdate,
  onRemove,
  onMove,
}: EditorBlockProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleUpdate = (updates: Partial<ClaudeMdBlock>) => {
    onUpdate(block.id, updates);
  };

  return (
    <div
      className="group relative flex items-stretch gap-0 rounded-lg transition-colors"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left action bar */}
      <div
        className={`flex flex-col items-center gap-0.5 pt-1 pr-2 shrink-0 transition-opacity duration-150 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="text-text-tertiary cursor-grab active:cursor-grabbing p-1" title="Drag to reorder">
          <DragHandleIcon size={12} />
        </div>
        <button
          onClick={() => onMove(block.id, 'up')}
          disabled={index === 0}
          className="p-0.5 text-text-tertiary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Move up"
        >
          <ChevronUpIcon />
        </button>
        <button
          onClick={() => onMove(block.id, 'down')}
          disabled={index === totalBlocks - 1}
          className="p-0.5 text-text-tertiary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Move down"
        >
          <ChevronDownIcon />
        </button>
      </div>

      {/* Block content */}
      <div
        className={`flex-1 min-w-0 border rounded-lg px-4 py-3 transition-colors ${
          isHovered
            ? 'border-border-default bg-surface-1'
            : 'border-transparent bg-transparent'
        }`}
      >
        {/* Block type label + delete button */}
        <div
          className={`flex items-center justify-between mb-2 transition-opacity duration-150 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="text-micro font-medium uppercase tracking-wider text-text-tertiary select-none">
            {BLOCK_TYPE_LABELS[block.type]}
          </span>
          <button
            onClick={() => onRemove(block.id)}
            className="p-1 text-text-tertiary hover:text-status-dirty transition-colors rounded-button"
            title="Delete block"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Render the appropriate block type */}
        {block.type === 'heading' && (
          <HeadingBlock block={block} onUpdate={handleUpdate} />
        )}
        {block.type === 'text' && (
          <TextBlock block={block} onUpdate={handleUpdate} />
        )}
        {block.type === 'list' && (
          <ListBlock block={block} onUpdate={handleUpdate} />
        )}
        {block.type === 'code' && (
          <CodeBlock block={block} onUpdate={handleUpdate} />
        )}
        {block.type === 'rule' && <RuleBlock />}
      </div>
    </div>
  );
}
