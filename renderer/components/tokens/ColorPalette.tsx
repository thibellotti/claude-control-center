import React, { useState, useRef, useEffect } from 'react';

interface ColorPaletteProps {
  colors: Record<string, string | Record<string, string>>;
  onUpdateColor: (path: string, value: string) => void;
}

// Attempt to resolve CSS variable references to hex values for display.
// Returns the original string if it cannot resolve.
function resolveColorForDisplay(value: string): string {
  if (!value.startsWith('var(')) return value;
  // Extract variable name: var(--surface-0) -> --surface-0
  const match = value.match(/var\(([^)]+)\)/);
  if (!match) return value;
  const varName = match[1].trim();

  // Try to read the computed value from the document
  if (typeof document !== 'undefined') {
    const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (computed) return computed;
  }
  return value;
}

// Check if a string looks like a valid CSS color
function isDisplayableColor(value: string): boolean {
  const resolved = resolveColorForDisplay(value);
  // Hex, rgb, rgba, hsl, hsla, named colors
  return /^#|^rgb|^hsl|^[a-z]+$/i.test(resolved);
}

interface ColorSwatchProps {
  name: string;
  path: string;
  value: string;
  onUpdate: (path: string, value: string) => void;
}

function ColorSwatch({ name, path, value, onUpdate }: ColorSwatchProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [hexInput, setHexInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const displayColor = resolveColorForDisplay(value);
  const isVariable = value.startsWith('var(');

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  function handleSwatchClick() {
    // Open native color picker
    if (colorInputRef.current) {
      colorInputRef.current.click();
    }
  }

  function handleColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newColor = e.target.value;
    // If the original was a CSS variable, keep it as the variable reference
    // and only update if user explicitly types a hex value
    if (isVariable) {
      // For CSS variables, don't update the config value — just show the picker
      // The user needs to edit the globals.css to change CSS variable colors
      return;
    }
    onUpdate(path, newColor);
  }

  function handleHexSubmit() {
    const trimmed = hexInput.trim();
    if (trimmed) {
      const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
      if (/^#[0-9a-fA-F]{3,8}$/.test(hex)) {
        onUpdate(path, hex);
      }
    }
    setIsEditing(false);
  }

  return (
    <div className="group flex flex-col items-center gap-1.5">
      {/* Color swatch */}
      <button
        onClick={handleSwatchClick}
        className="relative w-10 h-10 rounded-lg border border-border-subtle hover:border-border-default transition-all hover:scale-105 cursor-pointer overflow-hidden"
        title={`${name}: ${value}`}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: isDisplayableColor(value) ? displayColor : undefined,
            backgroundImage: !isDisplayableColor(value)
              ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
              : undefined,
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
          }}
        />
        {/* Hidden native color input */}
        <input
          ref={colorInputRef}
          type="color"
          value={displayColor.startsWith('#') ? displayColor : '#000000'}
          onChange={handleColorChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          tabIndex={-1}
        />
      </button>

      {/* Color name */}
      <span className="text-micro text-text-tertiary text-center leading-tight max-w-[56px] truncate">
        {name}
      </span>

      {/* Color value */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={handleHexSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleHexSubmit();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          className="w-16 text-micro font-mono text-text-secondary text-center bg-surface-2 border border-border-default rounded px-1 py-0.5 outline-none focus:border-accent"
        />
      ) : (
        <button
          onClick={() => {
            if (!isVariable) {
              setHexInput(value);
              setIsEditing(true);
            }
          }}
          className="text-micro font-mono text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
          title={isVariable ? 'CSS variable — edit in globals.css' : 'Click to edit'}
        >
          {isVariable ? value.replace(/var\(([^)]+)\)/, '$1') : displayColor}
        </button>
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-3">
      {title}
    </h4>
  );
}

export default function ColorPalette({ colors, onUpdateColor }: ColorPaletteProps) {
  // Group colors by category
  const groups: { name: string; entries: { name: string; path: string; value: string }[] }[] = [];

  for (const [key, value] of Object.entries(colors)) {
    if (typeof value === 'string') {
      // Ungrouped color
      let group = groups.find((g) => g.name === 'Other');
      if (!group) {
        group = { name: 'Other', entries: [] };
        groups.push(group);
      }
      group.entries.push({ name: key, path: key, value });
    } else if (typeof value === 'object') {
      // Grouped colors (e.g., surface.0, surface.1)
      const group = { name: key, entries: [] as { name: string; path: string; value: string }[] };
      for (const [subKey, subValue] of Object.entries(value)) {
        group.entries.push({
          name: subKey === 'DEFAULT' ? key : `${key}-${subKey}`,
          path: `${key}.${subKey}`,
          value: subValue,
        });
      }
      groups.push(group);
    }
  }

  if (groups.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-text-tertiary">No color tokens found in the config.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      {groups.map((group) => (
        <section key={group.name}>
          <SectionHeader title={group.name} />
          <div className="flex flex-wrap gap-4">
            {group.entries.map((entry) => (
              <ColorSwatch
                key={entry.path}
                name={entry.name}
                path={entry.path}
                value={entry.value}
                onUpdate={onUpdateColor}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
