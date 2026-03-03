import React, { useState } from 'react';
import Modal from '../shared/Modal';
import { useGitHub } from '../../hooks/useGitHub';
import { SpinnerIcon, ExternalLinkIcon } from '../icons';

interface CreatePRDialogProps {
  projectPath: string;
  open: boolean;
  onClose: () => void;
  onCreated: (url: string) => void;
  defaultBranch?: string;
}

export default function CreatePRDialog({ projectPath, open, onClose, onCreated, defaultBranch = 'main' }: CreatePRDialogProps) {
  const { createPR } = useGitHub(projectPath);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [baseBranch, setBaseBranch] = useState(defaultBranch);
  const [draft, setDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ url?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setResult(null);
    const res = await createPR({
      title: title.trim(),
      body: body.trim(),
      baseBranch: baseBranch.trim() || undefined,
      draft,
    });
    setSubmitting(false);

    if ('url' in res) {
      setResult({ url: res.url });
      onCreated(res.url);
    } else {
      setResult({ error: res.error });
    }
  };

  const handleClose = () => {
    setTitle('');
    setBody('');
    setBaseBranch(defaultBranch);
    setDraft(false);
    setResult(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create Pull Request" width="max-w-lg">
      {result?.url ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-8 h-8 rounded-full bg-status-active/15 flex items-center justify-center text-status-active">
            <svg width={16} height={16} viewBox="0 0 14 14" fill="none">
              <path d="M3 7.5l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm text-text-primary font-medium">Pull Request Created</p>
          <a
            href={result.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors"
          >
            {result.url} <ExternalLinkIcon size={10} />
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="PR title..."
              required
              autoFocus
              className="w-full px-3 py-2 text-sm bg-surface-2 border border-border-subtle rounded-button text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Description</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your changes..."
              rows={4}
              className="w-full px-3 py-2 text-sm bg-surface-2 border border-border-subtle rounded-button text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors resize-none"
            />
          </div>

          {/* Base branch */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Base branch</label>
            <input
              type="text"
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 text-sm bg-surface-2 border border-border-subtle rounded-button text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors font-mono"
            />
          </div>

          {/* Draft toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={draft}
              onChange={(e) => setDraft(e.target.checked)}
              className="rounded border-border-subtle bg-surface-2 text-accent focus:ring-accent/50"
            />
            <span className="text-xs text-text-secondary">Create as draft</span>
          </label>

          {/* Error */}
          {result?.error && (
            <div className="px-3 py-2 bg-feedback-error/10 border border-feedback-error/20 rounded-button">
              <p className="text-xs text-feedback-error">{result.error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-button text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <SpinnerIcon size={12} />
                Creating...
              </>
            ) : (
              'Create Pull Request'
            )}
          </button>
        </form>
      )}
    </Modal>
  );
}
