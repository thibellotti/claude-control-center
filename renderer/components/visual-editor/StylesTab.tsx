import React, { useState, useCallback, useMemo } from 'react';
import type { SelectedElement, VisualAction } from '../../../shared/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StylesTabProps {
  element: SelectedElement;
  onExecuteAction: (action: VisualAction) => void;
}

type StyleCategory = 'layout' | 'spacing' | 'colors' | 'typography' | 'border' | 'other';

interface ParsedClass {
  raw: string;
  category: StyleCategory;
  property: string;
}

// ---------------------------------------------------------------------------
// Tailwind class categorizer
// ---------------------------------------------------------------------------

function spacingLabel(cls: string): string {
  const prefix = cls.match(/^(p|m)(x|y|t|r|b|l)?/)?.[0] || '';
  const labels: Record<string, string> = {
    'p': 'Padding', 'px': 'Padding X', 'py': 'Padding Y',
    'pt': 'Padding Top', 'pr': 'Padding Right', 'pb': 'Padding Bottom', 'pl': 'Padding Left',
    'm': 'Margin', 'mx': 'Margin X', 'my': 'Margin Y',
    'mt': 'Margin Top', 'mr': 'Margin Right', 'mb': 'Margin Bottom', 'ml': 'Margin Left',
  };
  return labels[prefix] || prefix;
}

function categorizeClass(cls: string): { category: StyleCategory; property: string } {
  // Layout
  if (/^(flex|grid|block|inline|hidden)/.test(cls)) return { category: 'layout', property: 'Display' };
  if (/^(items-|justify-|self-|place-)/.test(cls)) return { category: 'layout', property: cls.split('-')[0] };
  if (/^(flex-|order-)/.test(cls)) return { category: 'layout', property: cls.split('-')[0] };

  // Spacing
  if (/^p[xytrbl]?-/.test(cls)) return { category: 'spacing', property: spacingLabel(cls) };
  if (/^m[xytrbl]?-/.test(cls)) return { category: 'spacing', property: spacingLabel(cls) };
  if (/^gap-/.test(cls)) return { category: 'spacing', property: 'Gap' };
  if (/^space-/.test(cls)) return { category: 'spacing', property: 'Space' };

  // Colors (text-* that are NOT sizes)
  if (/^bg-/.test(cls)) return { category: 'colors', property: 'Background' };
  if (/^text-(?!xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)/.test(cls)) return { category: 'colors', property: 'Text Color' };
  if (/^border-(?!0|2|4|8|t|b|l|r)/.test(cls)) return { category: 'colors', property: 'Border Color' };

  // Typography
  if (/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)/.test(cls)) return { category: 'typography', property: 'Font Size' };
  if (/^font-(thin|light|normal|medium|semibold|bold|extrabold|black)/.test(cls)) return { category: 'typography', property: 'Font Weight' };
  if (/^leading-/.test(cls)) return { category: 'typography', property: 'Line Height' };
  if (/^tracking-/.test(cls)) return { category: 'typography', property: 'Letter Spacing' };

  // Border / Radius
  if (/^rounded/.test(cls)) return { category: 'border', property: 'Border Radius' };
  if (/^border-(0|2|4|8|t|b|l|r)/.test(cls)) return { category: 'border', property: 'Border Width' };

  return { category: 'other', property: 'Other' };
}

function parseClasses(className: string): ParsedClass[] {
  return className
    .split(/\s+/)
    .filter(Boolean)
    .map(raw => {
      const { category, property } = categorizeClass(raw);
      return { raw, category, property };
    });
}

function replaceClass(className: string, oldClass: string, newClass: string): string {
  return className
    .split(/\s+/)
    .map(c => c === oldClass ? newClass : c)
    .join(' ');
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPACING_STEPS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 48, 64];

const TAILWIND_COLORS = [
  'slate', 'gray', 'zinc', 'red', 'orange', 'yellow',
  'green', 'blue', 'indigo', 'purple', 'pink',
];

const COLOR_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

const FONT_SIZES = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];

const FONT_WEIGHTS = ['thin', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black'];

const BORDER_RADII = ['none', 'sm', '', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];

const CATEGORY_LABELS: Record<StyleCategory, string> = {
  layout: 'Layout',
  spacing: 'Spacing',
  colors: 'Colors',
  typography: 'Typography',
  border: 'Border',
  other: 'Other',
};

const CATEGORY_ORDER: StyleCategory[] = ['layout', 'spacing', 'colors', 'typography', 'border', 'other'];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StylesTab({ element, onExecuteAction }: StylesTabProps) {
  const parsed = useMemo(() => parseClasses(element.className || ''), [element.className]);

  const grouped = useMemo(() => {
    const groups: Partial<Record<StyleCategory, ParsedClass[]>> = {};
    for (const p of parsed) {
      (groups[p.category] ??= []).push(p);
    }
    return groups;
  }, [parsed]);

  const emitChange = useCallback((oldCls: string, newCls: string) => {
    const action: VisualAction = {
      id: crypto.randomUUID(),
      type: 'style-change',
      element,
      oldClass: element.className,
      newClass: replaceClass(element.className, oldCls, newCls),
    };
    onExecuteAction(action);
  }, [element, onExecuteAction]);

  if (parsed.length === 0) {
    return (
      <div className="p-4 text-text-tertiary text-xs">
        No Tailwind classes detected
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {CATEGORY_ORDER.map(cat => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;
        return (
          <CategorySection
            key={cat}
            category={cat}
            items={items}
            onClassChange={emitChange}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible category section
// ---------------------------------------------------------------------------

interface CategorySectionProps {
  category: StyleCategory;
  items: ParsedClass[];
  onClassChange: (oldCls: string, newCls: string) => void;
}

function CategorySection({ category, items, onClassChange }: CategorySectionProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-border-subtle">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        <span className="uppercase tracking-wider text-micro">{CATEGORY_LABELS[category]}</span>
        <svg
          className={`w-3 h-3 transition-transform ${open ? '' : '-rotate-90'}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-2">
          {items.map((item) => (
            <ClassControl
              key={item.raw}
              item={item}
              onClassChange={onClassChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-class control (delegates to specialized controls)
// ---------------------------------------------------------------------------

interface ClassControlProps {
  item: ParsedClass;
  onClassChange: (oldCls: string, newCls: string) => void;
}

function ClassControl({ item, onClassChange }: ClassControlProps) {
  if (item.category === 'spacing') {
    return <SpacingControl item={item} onClassChange={onClassChange} />;
  }
  if (item.category === 'colors') {
    return <ColorControl item={item} onClassChange={onClassChange} />;
  }
  if (item.category === 'typography') {
    if (item.property === 'Font Size') {
      return <FontSizeControl item={item} onClassChange={onClassChange} />;
    }
    if (item.property === 'Font Weight') {
      return <FontWeightControl item={item} onClassChange={onClassChange} />;
    }
    return <GenericClassInput item={item} onClassChange={onClassChange} />;
  }
  if (item.category === 'border' && item.property === 'Border Radius') {
    return <BorderRadiusControl item={item} onClassChange={onClassChange} />;
  }
  return <GenericClassInput item={item} onClassChange={onClassChange} />;
}

// ---------------------------------------------------------------------------
// Spacing slider
// ---------------------------------------------------------------------------

function SpacingControl({ item, onClassChange }: ClassControlProps) {
  // Extract prefix (e.g. "px" from "px-4") and value
  const match = item.raw.match(/^([a-z]+)-(\d+)$/);
  const prefix = match?.[1] || '';
  const currentVal = match ? Number(match[2]) : 0;
  const stepIndex = SPACING_STEPS.indexOf(currentVal);
  const sliderVal = stepIndex >= 0 ? stepIndex : 0;

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = Number(e.target.value);
    const newVal = SPACING_STEPS[idx];
    const newCls = `${prefix}-${newVal}`;
    if (newCls !== item.raw) {
      onClassChange(item.raw, newCls);
    }
  }, [prefix, item.raw, onClassChange]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-secondary min-w-[80px] shrink-0">{item.property}</span>
      <input
        type="range"
        min={0}
        max={SPACING_STEPS.length - 1}
        value={sliderVal}
        onChange={handleSlider}
        className="flex-1 accent-accent h-1"
      />
      <span className="text-micro font-mono text-text-tertiary w-6 text-right">{currentVal}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Color control
// ---------------------------------------------------------------------------

function ColorControl({ item, onClassChange }: ClassControlProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Extract prefix (bg, text, border) and color value
  const prefixMatch = item.raw.match(/^(bg|text|border)-(.+)$/);
  const prefix = prefixMatch?.[1] || 'bg';
  const colorValue = prefixMatch?.[2] || '';

  const handleSelect = useCallback((color: string, shade: number) => {
    const newCls = `${prefix}-${color}-${shade}`;
    if (newCls !== item.raw) {
      onClassChange(item.raw, newCls);
    }
    setShowPicker(false);
  }, [prefix, item.raw, onClassChange]);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-secondary min-w-[80px] shrink-0">{item.property}</span>
        <button
          onClick={() => setShowPicker(p => !p)}
          className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1 rounded bg-surface-2 border border-border-subtle text-xs text-text-primary font-mono hover:border-accent transition-colors"
        >
          <ColorSwatch cls={item.raw} />
          <span className="truncate">{colorValue}</span>
        </button>
      </div>

      {showPicker && (
        <div className="ml-[92px] p-2 rounded bg-surface-2 border border-border-subtle">
          <div className="grid grid-cols-11 gap-px">
            {TAILWIND_COLORS.map(color =>
              COLOR_SHADES.map(shade => (
                <button
                  key={`${color}-${shade}`}
                  onClick={() => handleSelect(color, shade)}
                  title={`${color}-${shade}`}
                  className="w-4 h-4 rounded-sm hover:ring-1 hover:ring-accent transition-shadow"
                  style={{ backgroundColor: `var(--tw-${color}-${shade}, #888)` }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ColorSwatch({ cls }: { cls: string }) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-sm border border-border-subtle ${cls.startsWith('text-') ? cls : ''}`}
      style={cls.startsWith('bg-') ? { backgroundColor: 'currentColor' } : undefined}
    >
      {cls.startsWith('bg-') && <span className={`block w-full h-full rounded-sm ${cls}`} />}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Font size dropdown
// ---------------------------------------------------------------------------

function FontSizeControl({ item, onClassChange }: ClassControlProps) {
  const current = item.raw.replace('text-', '');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCls = `text-${e.target.value}`;
    if (newCls !== item.raw) {
      onClassChange(item.raw, newCls);
    }
  }, [item.raw, onClassChange]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-secondary min-w-[80px] shrink-0">{item.property}</span>
      <select
        value={current}
        onChange={handleChange}
        className="flex-1 px-2 py-1 rounded bg-surface-2 border border-border-subtle text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
      >
        {FONT_SIZES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Font weight dropdown
// ---------------------------------------------------------------------------

function FontWeightControl({ item, onClassChange }: ClassControlProps) {
  const current = item.raw.replace('font-', '');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCls = `font-${e.target.value}`;
    if (newCls !== item.raw) {
      onClassChange(item.raw, newCls);
    }
  }, [item.raw, onClassChange]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-secondary min-w-[80px] shrink-0">{item.property}</span>
      <select
        value={current}
        onChange={handleChange}
        className="flex-1 px-2 py-1 rounded bg-surface-2 border border-border-subtle text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
      >
        {FONT_WEIGHTS.map(w => (
          <option key={w} value={w}>{w}</option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Border radius dropdown
// ---------------------------------------------------------------------------

function BorderRadiusControl({ item, onClassChange }: ClassControlProps) {
  // Parse current: "rounded", "rounded-lg", "rounded-full", etc.
  const current = item.raw === 'rounded' ? '' : item.raw.replace('rounded-', '');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const newCls = val === '' ? 'rounded' : `rounded-${val}`;
    if (newCls !== item.raw) {
      onClassChange(item.raw, newCls);
    }
  }, [item.raw, onClassChange]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-secondary min-w-[80px] shrink-0">{item.property}</span>
      <select
        value={current}
        onChange={handleChange}
        className="flex-1 px-2 py-1 rounded bg-surface-2 border border-border-subtle text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
      >
        {BORDER_RADII.map(r => (
          <option key={r || 'default'} value={r}>{r || 'default'}</option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic text input fallback
// ---------------------------------------------------------------------------

function GenericClassInput({ item, onClassChange }: ClassControlProps) {
  const [localValue, setLocalValue] = useState(item.raw);

  const handleCommit = useCallback(() => {
    if (localValue !== item.raw && localValue.trim()) {
      onClassChange(item.raw, localValue.trim());
    }
  }, [localValue, item.raw, onClassChange]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-secondary min-w-[80px] shrink-0">{item.property}</span>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); }}
        className="flex-1 px-2 py-1 rounded bg-surface-2 border border-border-subtle text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
      />
    </div>
  );
}
