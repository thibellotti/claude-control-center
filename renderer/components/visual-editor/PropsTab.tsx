import React, { useState, useCallback } from 'react';
import type { SelectedElement, VisualAction } from '../../../shared/types';

interface PropsTabProps {
  element: SelectedElement;
  onExecuteAction: (action: VisualAction) => void;
}

// Detect the type of a prop value for rendering the right control
function detectPropType(value: unknown): 'string' | 'boolean' | 'number' | 'function' | 'unknown' {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'function') return 'function';
  return 'unknown';
}

export default function PropsTab({ element, onExecuteAction }: PropsTabProps) {
  const props = element.reactProps || {};
  const propEntries = Object.entries(props);

  if (propEntries.length === 0) {
    return (
      <div className="p-4 text-text-tertiary text-xs">
        No editable props detected
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {propEntries.map(([key, value]) => (
        <PropControl
          key={key}
          name={key}
          value={value}
          element={element}
          onExecuteAction={onExecuteAction}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual prop control
// ---------------------------------------------------------------------------

interface PropControlProps {
  name: string;
  value: unknown;
  element: SelectedElement;
  onExecuteAction: (action: VisualAction) => void;
}

function PropControl({ name, value, element, onExecuteAction }: PropControlProps) {
  const propType = detectPropType(value);
  const [localValue, setLocalValue] = useState(String(value ?? ''));

  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue);
    const action: VisualAction = {
      id: crypto.randomUUID(),
      type: 'prop-change',
      element,
      propName: name,
      oldValue: String(value),
      newValue: newValue,
    };
    onExecuteAction(action);
  }, [element, name, value, onExecuteAction]);

  const handleBoolChange = useCallback((checked: boolean) => {
    const newVal = String(checked);
    setLocalValue(newVal);
    const action: VisualAction = {
      id: crypto.randomUUID(),
      type: 'prop-change',
      element,
      propName: name,
      oldValue: String(value),
      newValue: newVal,
    };
    onExecuteAction(action);
  }, [element, name, value, onExecuteAction]);

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Label */}
      <label className="text-xs text-text-secondary font-mono shrink-0 min-w-[80px]">
        {name}
      </label>

      {/* Control */}
      <div className="flex-1 min-w-0">
        {propType === 'boolean' && (
          <input
            type="checkbox"
            checked={localValue === 'true'}
            onChange={(e) => handleBoolChange(e.target.checked)}
            className="accent-accent w-4 h-4"
          />
        )}

        {propType === 'number' && (
          <input
            type="number"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleChange((e.target as HTMLInputElement).value); }}
            className="w-full px-2 py-1 rounded bg-surface-2 border border-border-subtle text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
          />
        )}

        {propType === 'string' && (
          <input
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleChange((e.target as HTMLInputElement).value); }}
            className="w-full px-2 py-1 rounded bg-surface-2 border border-border-subtle text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
          />
        )}

        {propType === 'function' && (
          <span className="text-micro text-text-tertiary italic">(handler)</span>
        )}

        {propType === 'unknown' && (
          <span className="text-micro text-text-tertiary font-mono truncate">{JSON.stringify(value)}</span>
        )}
      </div>
    </div>
  );
}
