import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Agent } from '../../../shared/agent-types';

interface AgentEditorProps {
  agent: Agent | null; // null = creating new
  onSave: (agent: Agent) => void;
  onDelete?: (agentId: string) => void;
  onClose: () => void;
}

export default function AgentEditor({ agent, onSave, onDelete, onClose }: AgentEditorProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [defaultTask, setDefaultTask] = useState('');
  const [timeoutSeconds, setTimeoutSeconds] = useState(900);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setIcon(agent.icon);
      setSystemPrompt(agent.systemPrompt);
      setDefaultTask(agent.defaultTask || '');
      setTimeoutSeconds(agent.timeoutSeconds);
    } else {
      setName('');
      setIcon('');
      setSystemPrompt('');
      setDefaultTask('');
      setTimeoutSeconds(900);
    }
  }, [agent]);

  useEffect(() => {
    const timer = setTimeout(() => nameRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim() || !systemPrompt.trim()) return;

    const now = Date.now();
    const saved: Agent = {
      id: agent?.id || `agent-${now}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      icon: icon.trim() || '🤖',
      systemPrompt: systemPrompt.trim(),
      model: agent?.model || 'claude',
      defaultTask: defaultTask.trim() || undefined,
      timeoutSeconds,
      createdAt: agent?.createdAt || now,
      updatedAt: now,
    };

    onSave(saved);
    onClose();
  }, [name, icon, systemPrompt, defaultTask, timeoutSeconds, agent, onSave, onClose]);

  const handleDelete = useCallback(() => {
    if (agent && onDelete) {
      onDelete(agent.id);
      onClose();
    }
  }, [agent, onDelete, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
    },
    [onClose, handleSave]
  );

  const isEditing = !!agent;
  const canSave = name.trim().length > 0 && systemPrompt.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm modal-backdrop"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-editor-title"
    >
      <div
        className="w-full max-w-lg mx-4 bg-surface-1 border border-border-subtle rounded-card shadow-2xl modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 id="agent-editor-title" className="text-sm font-semibold text-text-primary">
            {isEditing ? 'Edit Agent' : 'Create Agent'}
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
          {/* Name + Icon row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">
                Name
              </label>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Agent name..."
                className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border-subtle text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="w-20">
              <label className="block text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">
                Icon
              </label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value.slice(0, 2))}
                placeholder="🤖"
                maxLength={2}
                className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border-subtle text-sm text-text-primary text-center placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Describe what this agent does..."
              rows={8}
              className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border-subtle text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors resize-y font-mono leading-relaxed"
            />
          </div>

          {/* Default Task */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">
              Default Task
            </label>
            <input
              type="text"
              value={defaultTask}
              onChange={(e) => setDefaultTask(e.target.value)}
              placeholder="Pre-filled task when running this agent..."
              className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border-subtle text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Timeout */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">
              Timeout (seconds)
            </label>
            <input
              type="number"
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(Math.max(60, parseInt(e.target.value, 10) || 900))}
              min={60}
              max={3600}
              className="w-32 px-3 py-2 rounded-md bg-surface-2 border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
            />
            <p className="text-micro text-text-tertiary mt-1">
              {Math.floor(timeoutSeconds / 60)}m {timeoutSeconds % 60}s
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle">
          <div>
            {isEditing && onDelete && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">Delete this agent?</span>
                    <button
                      onClick={handleDelete}
                      className="px-2 py-1 rounded-button text-xs font-medium bg-feedback-error-muted text-feedback-error hover:bg-feedback-error-muted transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-1 rounded-button text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-2 py-1 rounded-button text-xs text-feedback-error hover:bg-feedback-error-muted transition-colors"
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
              className="px-3 py-1 rounded-button text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-1 rounded-button text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
