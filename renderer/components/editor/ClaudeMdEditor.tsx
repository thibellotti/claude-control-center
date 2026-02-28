import React, { useEffect, useState, useRef } from 'react';
import type { ClaudeMdBlock } from '../../../shared/types';
import { useClaudeMdEditor } from '../../hooks/useClaudeMdEditor';
import EditorBlock from './EditorBlock';
import { PlusIcon, SaveIcon, CodeViewIcon, FileIcon } from '../icons';

interface ClaudeMdEditorProps {
  filePath: string;
  onSave?: () => void;
}

// Block type options for the "Add block" dropdown
const BLOCK_TYPES: { type: ClaudeMdBlock['type']; label: string; description: string }[] = [
  { type: 'heading', label: 'Heading', description: 'Section heading (H1-H4)' },
  { type: 'text', label: 'Text', description: 'Plain text paragraph' },
  { type: 'list', label: 'List', description: 'Bulleted list of items' },
  { type: 'code', label: 'Code', description: 'Fenced code block' },
  { type: 'rule', label: 'Divider', description: 'Horizontal rule separator' },
];

export default function ClaudeMdEditor({ filePath, onSave }: ClaudeMdEditorProps) {
  const {
    blocks,
    addBlock,
    updateBlock,
    removeBlock,
    moveBlock,
    save,
    createFile,
    isDirty,
    isLoading,
    error,
    fileExists,
    getRawContent,
  } = useClaudeMdEditor(filePath);

  const [showRaw, setShowRaw] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !isSaving) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, isSaving, blocks]);

  // Close the add menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddMenu]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await save();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      onSave?.();
    } catch {
      // Error is already set by the hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBlock = (type: ClaudeMdBlock['type']) => {
    addBlock(type);
    setShowAddMenu(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-text-tertiary">Loading...</div>
      </div>
    );
  }

  // File doesn't exist state
  if (!fileExists) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-text-tertiary">
          <FileIcon />
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-text-primary">No CLAUDE.md found</p>
          <p className="text-xs text-text-tertiary">
            Create a CLAUDE.md file to configure project-specific instructions for Claude.
          </p>
        </div>
        <button
          onClick={createFile}
          className="flex items-center gap-1.5 px-4 py-2 rounded-button text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          <PlusIcon />
          Create CLAUDE.md
        </button>
        {error && (
          <p className="text-xs text-status-dirty mt-2">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Sticky save bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 bg-surface-1 border border-border-subtle rounded-lg mb-4">
        <div className="flex items-center gap-3">
          {isDirty ? (
            <span className="flex items-center gap-1.5 text-xs text-status-dirty">
              <span className="w-1.5 h-1.5 rounded-full bg-status-dirty" />
              Unsaved changes
            </span>
          ) : saveSuccess ? (
            <span className="flex items-center gap-1.5 text-xs text-status-clean">
              <span className="w-1.5 h-1.5 rounded-full bg-status-clean" />
              Saved
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
              <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
              No changes
            </span>
          )}
          {error && (
            <span className="text-xs text-status-dirty">{error}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-button text-xs font-medium transition-colors ${
              showRaw
                ? 'bg-accent-muted text-accent'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2'
            }`}
            title={showRaw ? 'Switch to block editor' : 'View raw markdown'}
          >
            <CodeViewIcon />
            {showRaw ? 'Blocks' : 'Raw'}
          </button>
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
      </div>

      {/* Raw markdown view */}
      {showRaw ? (
        <div className="bg-surface-1 border border-border-subtle rounded-lg p-4">
          <textarea
            value={getRawContent()}
            readOnly
            className="w-full min-h-[400px] bg-transparent text-[12px] font-mono text-text-secondary leading-relaxed focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>
      ) : (
        <>
          {/* Block editor */}
          <div className="space-y-1">
            {blocks.map((block, index) => (
              <EditorBlock
                key={block.id}
                block={block}
                index={index}
                totalBlocks={blocks.length}
                onUpdate={updateBlock}
                onRemove={removeBlock}
                onMove={moveBlock}
              />
            ))}
          </div>

          {/* Empty state */}
          {blocks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-text-tertiary mb-1">This file is empty</p>
              <p className="text-xs text-text-tertiary">Add a block to get started</p>
            </div>
          )}

          {/* Add block button */}
          <div className="relative mt-4" ref={addMenuRef}>
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border-default text-xs text-text-tertiary hover:text-text-secondary hover:border-border-strong hover:bg-surface-1 transition-colors w-full justify-center"
            >
              <PlusIcon />
              Add block
            </button>

            {/* Dropdown menu */}
            {showAddMenu && (
              <div className="absolute left-0 right-0 bottom-full mb-1 bg-surface-2 border border-border-default rounded-lg shadow-lg overflow-hidden z-20">
                {BLOCK_TYPES.map((bt) => (
                  <button
                    key={bt.type}
                    onClick={() => handleAddBlock(bt.type)}
                    className="flex flex-col items-start w-full px-4 py-2.5 hover:bg-surface-3 transition-colors text-left"
                  >
                    <span className="text-xs font-medium text-text-primary">{bt.label}</span>
                    <span className="text-[11px] text-text-tertiary">{bt.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
