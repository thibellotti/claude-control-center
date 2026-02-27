import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Workspace } from '../../../shared/types';

interface WorkspaceEditorProps {
  workspace: Workspace | null; // null = create new
  onSave: (workspace: Partial<Workspace> & { name: string }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Teal', hex: '#14B8A6' },
];

export default function WorkspaceEditor({
  workspace,
  onSave,
  onDelete,
  onClose,
}: WorkspaceEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0].hex);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description);
      setColor(workspace.color);
    } else {
      setName('');
      setDescription('');
      setColor(PRESET_COLORS[0].hex);
    }
  }, [workspace]);

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 100);
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    onSave({
      ...(workspace || {}),
      name: name.trim(),
      description: description.trim(),
      color,
      projectPaths: workspace?.projectPaths || [],
    });
    onClose();
  }, [name, description, color, workspace, onSave, onClose]);

  const handleDelete = useCallback(() => {
    if (workspace && onDelete) {
      onDelete(workspace.id);
      onClose();
    }
  }, [workspace, onDelete, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSave();
      }
    },
    [onClose, handleSave]
  );

  const isEditing = !!workspace;
  const canSave = name.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-lg mx-4 bg-surface-1 border border-border-subtle rounded-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">
            {isEditing ? 'Edit Workspace' : 'Create Workspace'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1.5">
              Name
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client or workspace name..."
              className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border-subtle text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border-subtle text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors resize-y leading-relaxed"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-2">
              Color
            </label>
            <div className="flex items-center gap-3">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.hex}
                  onClick={() => setColor(preset.hex)}
                  className={`w-7 h-7 rounded-full transition-all duration-150 ${
                    color === preset.hex
                      ? 'ring-2 ring-offset-2 ring-offset-surface-1 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: preset.hex,
                    ['--tw-ring-color' as string]: color === preset.hex ? preset.hex : undefined,
                  }}
                  aria-label={preset.name}
                  title={preset.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle">
          <div>
            {isEditing && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">Delete this workspace?</span>
                    <button
                      onClick={handleDelete}
                      className="px-2.5 py-1 rounded-button text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 rounded-button text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-2.5 py-1 rounded-button text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-button text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-1.5 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
