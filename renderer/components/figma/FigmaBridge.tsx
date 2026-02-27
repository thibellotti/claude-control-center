import React, { useState } from 'react';
import { useFigmaBridge, parseFigmaUrl } from '../../hooks/useFigmaBridge';
import FigmaLinkCard from './FigmaLinkCard';

interface FigmaBridgeProps {
  projectId: string;
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FigmaIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 28a5 5 0 005-5v-5h-5a5 5 0 000 10z" fill="#0ACF83" />
      <path d="M6 18a5 5 0 015-5h5v10h-5a5 5 0 01-5-5z" fill="#A259FF" />
      <path d="M6 8a5 5 0 015-5h5v10h-5a5 5 0 01-5-5z" fill="#F24E1E" />
      <path d="M16 3h5a5 5 0 010 10h-5V3z" fill="#FF7262" />
      <path d="M26 8a5 5 0 01-5 5 5 5 0 01-5-5 5 5 0 015-5 5 5 0 015 5z" fill="#1ABCFE" />
    </svg>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 border-2 border-border-subtle border-t-accent rounded-full animate-spin" />
    </div>
  );
}

export default function FigmaBridge({ projectId }: FigmaBridgeProps) {
  const { links, addLink, removeLink, isLoading } = useFigmaBridge(projectId);

  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function handleUrlChange(value: string) {
    setUrl(value);
    if (urlError) {
      setUrlError(null);
    }
  }

  function validateUrl(value: string): boolean {
    if (!value.trim()) {
      setUrlError('URL is required');
      return false;
    }
    const parsed = parseFigmaUrl(value.trim());
    if (!parsed) {
      setUrlError('Please enter a valid Figma design URL (figma.com/design/... or figma.com/file/...)');
      return false;
    }
    setUrlError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedUrl = url.trim();
    const trimmedLabel = label.trim() || 'Untitled Frame';

    if (!validateUrl(trimmedUrl)) return;

    setIsSaving(true);
    try {
      await addLink(trimmedUrl, trimmedLabel);
      setUrl('');
      setLabel('');
      setUrlError(null);
      setShowForm(false);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Failed to save link');
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setUrl('');
    setLabel('');
    setUrlError(null);
    setShowForm(false);
  }

  async function handleDelete(linkId: string) {
    await removeLink(linkId);
  }

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Design Links</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            <PlusIcon />
            Link Figma Frame
          </button>
        )}
      </div>

      {/* Add link form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-surface-1 border border-border-subtle rounded-lg p-4 space-y-3"
        >
          <div>
            <input
              type="text"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onBlur={() => url.trim() && validateUrl(url.trim())}
              placeholder="Paste Figma URL..."
              className={`w-full px-3 py-2 rounded-md bg-surface-0 border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 transition-colors ${
                urlError
                  ? 'border-red-500/50 focus:ring-red-500/30'
                  : 'border-border-subtle focus:border-accent focus:ring-accent/30'
              }`}
              autoFocus
            />
            {urlError && (
              <p className="text-xs text-red-400 mt-1.5">{urlError}</p>
            )}
          </div>

          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Frame label..."
            className="w-full px-3 py-2 rounded-md bg-surface-0 border border-border-subtle text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Adding...' : 'Add'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Link list */}
      {links.length > 0 ? (
        <div className="space-y-2">
          {links.map((link) => (
            <FigmaLinkCard key={link.id} link={link} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        /* Empty state */
        !showForm && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 opacity-40">
              <FigmaIcon />
            </div>
            <p className="text-sm text-text-secondary mb-1">
              Link your Figma designs to this project
            </p>
            <p className="text-xs text-text-tertiary">
              Paste a Figma URL to preview frames inline
            </p>
          </div>
        )
      )}
    </div>
  );
}
