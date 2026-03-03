import React, { useState } from 'react';
import type { SelectedElement, VisualAction } from '../../../shared/types';
import PropsTab from './PropsTab';
import StylesTab from './StylesTab';
import TreeTab from './TreeTab';

interface InspectorProps {
  selectedElement: SelectedElement | null;
  onExecuteAction: (action: VisualAction) => void;
}

export default function Inspector({ selectedElement, onExecuteAction }: InspectorProps) {
  const [activeTab, setActiveTab] = useState<'props' | 'styles' | 'tree'>('props');

  if (!selectedElement) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
        Click an element to inspect
      </div>
    );
  }

  // Hide Props tab when no React fiber detected
  const showProps = selectedElement.reactFiber;
  // Default to styles tab if no React fiber
  const effectiveTab = activeTab === 'props' && !showProps ? 'styles' : activeTab;

  const tabs = [
    ...(showProps ? [{ id: 'props' as const, label: 'Props' }] : []),
    { id: 'styles' as const, label: 'Styles' },
    { id: 'tree' as const, label: 'Tree' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header: component name + file */}
      <div className="px-4 pt-3 pb-2 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-accent font-medium">
            {'<'}{selectedElement.reactComponent || selectedElement.tagName}{'>'}
          </span>
          {selectedElement.sourceFile && (
            <span className="text-micro text-text-tertiary truncate">
              {selectedElement.sourceFile.split('/').pop()}
              {selectedElement.sourceLine ? `:${selectedElement.sourceLine}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center border-b border-border-subtle px-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium transition-colors relative ${
              effectiveTab === tab.id
                ? 'text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {tab.label}
            {effectiveTab === tab.id && (
              <span className="absolute bottom-0 left-3 right-3 h-px bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {effectiveTab === 'props' && showProps && (
          <PropsTab
            element={selectedElement}
            onExecuteAction={onExecuteAction}
          />
        )}
        {effectiveTab === 'styles' && (
          <StylesTab
            element={selectedElement}
            onExecuteAction={onExecuteAction}
          />
        )}
        {effectiveTab === 'tree' && (
          <TreeTab
            element={selectedElement}
            onExecuteAction={onExecuteAction}
            // onScrollTo: scrolling the canvas to a selector is not yet wired
            // at the Inspector level — pass a no-op for now.
            onScrollTo={() => {}}
          />
        )}
      </div>
    </div>
  );
}
