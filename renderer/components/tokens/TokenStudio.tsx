import React, { useState } from 'react';
import { useTokenStudio } from '../../hooks/useTokenStudio';
import ColorPalette from './ColorPalette';
import SpacingScale from './SpacingScale';
import TypographyPreview from './TypographyPreview';
import { SaveIcon, TokenFileIcon } from '../icons';

interface TokenStudioProps {
  projectPath: string;
}

const TOKEN_TABS = [
  { id: 'colors', label: 'Colors' },
  { id: 'spacing', label: 'Spacing' },
  { id: 'typography', label: 'Typography' },
  { id: 'raw', label: 'Raw' },
] as const;

type TokenTab = (typeof TOKEN_TABS)[number]['id'];

export default function TokenStudio({ projectPath }: TokenStudioProps) {
  const [activeTab, setActiveTab] = useState<TokenTab>('colors');
  const [isSaving, setIsSaving] = useState(false);

  const {
    tokens,
    isLoading,
    isDirty,
    error,
    fileExists,
    configFileName,
    updateColor,
    updateRaw,
    save,
  } = useTokenStudio(projectPath);

  async function handleSave() {
    setIsSaving(true);
    try {
      await save();
    } catch {
      // Error is handled by the hook
    } finally {
      setIsSaving(false);
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block w-5 h-5 border-2 border-border-default border-t-accent rounded-full animate-spin" />
        <p className="text-sm text-text-tertiary mt-3">Loading design tokens...</p>
      </div>
    );
  }

  // No tailwind config found
  if (!fileExists) {
    return (
      <div className="py-16 text-center">
        <div className="text-text-tertiary mb-3">
          <TokenFileIcon />
        </div>
        <p className="text-sm text-text-secondary">No Tailwind config found</p>
        <p className="text-xs text-text-tertiary mt-1">
          This project does not have a tailwind.config.js or tailwind.config.ts file.
        </p>
      </div>
    );
  }

  if (!tokens) return null;

  return (
    <div className="py-4">
      {/* Top bar: file name + save button */}
      <div className="flex items-center justify-between mb-4 sticky top-0 z-10 bg-surface-0 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-text-tertiary">{configFileName}</span>
          {isDirty && (
            <span className="text-micro font-medium text-status-dirty px-1.5 py-0.5 bg-surface-2 rounded">
              Unsaved
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium transition-colors ${
            isDirty
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'bg-surface-2 text-text-tertiary cursor-not-allowed'
          }`}
        >
          <SaveIcon />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-surface-1 border border-status-dirty rounded-card text-xs text-status-dirty">
          {error}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex items-center gap-0 border-b border-border-subtle mb-4">
        {TOKEN_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                isActive
                  ? 'text-text-primary border-accent'
                  : 'text-text-tertiary hover:text-text-secondary border-transparent'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'colors' && (
          <ColorPalette colors={tokens.colors} onUpdateColor={updateColor} />
        )}
        {activeTab === 'spacing' && <SpacingScale spacing={tokens.spacing} />}
        {activeTab === 'typography' && (
          <TypographyPreview
            fontFamily={tokens.fontFamily}
            fontSize={tokens.fontSize}
          />
        )}
        {activeTab === 'raw' && (
          <div className="py-4">
            <textarea
              value={tokens.raw}
              onChange={(e) => updateRaw(e.target.value)}
              className="w-full h-[500px] bg-surface-1 border border-border-subtle rounded-card p-4 font-mono text-xs text-text-primary resize-y outline-none focus:border-border-default transition-colors leading-relaxed"
              spellCheck={false}
            />
            <p className="text-micro text-text-tertiary mt-2">
              Edit the raw Tailwind config file directly. Changes will be written as-is
              when you save.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
