import React, { useState } from 'react';
import { useCheckpoints } from '../../hooks/useCheckpoints';
import { BranchIcon, TrashIcon, PlusIcon, SpinnerIcon } from '../icons';

interface CheckpointTimelineProps {
  projectPath: string;
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CheckpointTimeline({ projectPath }: CheckpointTimelineProps) {
  const { checkpoints, loading, create, restore, remove } = useCheckpoints(projectPath);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    await create(name.trim(), description.trim() || undefined);
    setName('');
    setDescription('');
    setShowForm(false);
    setCreating(false);
  }

  async function handleRestore(id: string) {
    setRestoringId(id);
    await restore(id);
    setRestoringId(null);
  }

  async function handleDelete(id: string) {
    await remove(id);
    setConfirmDeleteId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <SpinnerIcon size={16} className="text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Create button / form */}
      <div className="px-2 py-2 border-b border-border-subtle shrink-0">
        {showForm ? (
          <div className="flex flex-col gap-1.5">
            <input
              type="text"
              placeholder="Checkpoint name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full px-2 py-1 text-xs bg-surface-1 border border-border-subtle rounded text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent"
              autoFocus
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full px-2 py-1 text-xs bg-surface-1 border border-border-subtle rounded text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent"
            />
            <div className="flex gap-1">
              <button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="flex-1 px-2 py-1 text-xs font-medium bg-accent text-white rounded hover:bg-accent/90 disabled:opacity-40 transition-colors"
              >
                {creating ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setShowForm(false); setName(''); setDescription(''); }}
                className="px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 w-full px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-1 rounded transition-colors"
          >
            <PlusIcon size={10} />
            Create Checkpoint
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {checkpoints.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-text-tertiary">No checkpoints yet</p>
          </div>
        ) : (
          <div className="py-1">
            {checkpoints.map((cp, i) => (
              <div key={cp.id} className="relative flex gap-2 px-2 group">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center shrink-0 w-4">
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      cp.stashRef ? 'bg-accent' : 'bg-text-tertiary'
                    }`}
                  />
                  {i < checkpoints.length - 1 && (
                    <div className="w-px flex-1 bg-border-subtle" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-3 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-text-primary truncate">
                      {cp.name}
                    </span>
                    <span className="text-micro text-text-tertiary shrink-0">
                      {timeAgo(cp.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mt-0.5">
                    <BranchIcon size={10} className="text-text-tertiary" />
                    <span className="text-micro text-text-tertiary">{cp.branch}</span>
                    {!cp.stashRef && (
                      <span className="text-micro text-text-tertiary italic">clean</span>
                    )}
                  </div>

                  {cp.description && (
                    <p className="text-micro text-text-secondary mt-0.5 leading-snug">
                      {cp.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRestore(cp.id)}
                      disabled={restoringId === cp.id}
                      className="px-1.5 py-0.5 text-micro text-accent hover:bg-accent/10 rounded transition-colors disabled:opacity-40"
                    >
                      {restoringId === cp.id ? 'Restoring...' : 'Restore'}
                    </button>
                    {confirmDeleteId === cp.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(cp.id)}
                          className="px-1.5 py-0.5 text-micro text-status-error hover:bg-status-error/10 rounded transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 text-micro text-text-tertiary hover:text-text-secondary transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(cp.id)}
                        className="p-0.5 text-text-tertiary hover:text-status-error rounded transition-colors"
                      >
                        <TrashIcon size={10} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
