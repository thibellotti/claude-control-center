import React, { useState } from 'react';
import type { CellConfigPreview } from '../../../../shared/types';
import PreviewPanel from '../../preview/PreviewPanel';

interface PreviewCellProps {
  config: CellConfigPreview;
}

function isExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1';
  } catch {
    return false;
  }
}

export default function PreviewCell({ config }: PreviewCellProps) {
  const [currentUrl, setCurrentUrl] = useState(config.url);
  const [urlInput, setUrlInput] = useState(config.url);
  const [editing, setEditing] = useState(false);

  // If projectPath exists AND URL is localhost, use PreviewPanel (dev server mode)
  if (config.projectPath && !isExternalUrl(config.url)) {
    return <PreviewPanel projectPath={config.projectPath} />;
  }

  // External URLs or no projectPath: use webview (bypasses X-Frame-Options)
  return (
    <div className="h-full flex flex-col">
      {/* URL bar */}
      <div className="flex items-center gap-2 px-2 py-1 bg-surface-1 border-b border-border-subtle shrink-0">
        {editing ? (
          <form
            className="flex items-center gap-1 flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              let url = urlInput.trim();
              if (url && !url.startsWith('http')) url = `https://${url}`;
              if (url) setCurrentUrl(url);
              setEditing(false);
            }}
          >
            <input
              autoFocus
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onBlur={() => setEditing(false)}
              className="flex-1 px-2 py-0.5 rounded text-xs font-mono bg-surface-0 border border-border-subtle text-text-primary outline-none focus:border-accent"
              placeholder="https://..."
            />
          </form>
        ) : (
          <button
            onClick={() => { setUrlInput(currentUrl); setEditing(true); }}
            className="flex-1 text-left px-2 py-0.5 rounded text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors truncate"
            title="Click to edit URL"
          >
            {currentUrl.replace(/^https?:\/\//, '')}
          </button>
        )}
        <button
          onClick={() => setCurrentUrl((u) => u + (u.includes('?') ? '&' : '?') + `_r=${Date.now()}`)}
          className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors shrink-0"
          title="Reload"
        >
          <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v4h4" />
            <path d="M3.5 10a5 5 0 1 0 1-6.5L1 7" />
          </svg>
        </button>
        <button
          onClick={() => window.open(currentUrl, '_blank')}
          className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors shrink-0"
          title="Open in browser"
        >
          <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2h4v4" />
            <path d="M14 2L7 9" />
            <path d="M13 9v4a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1h4" />
          </svg>
        </button>
      </div>

      {/* Webview for external URLs — bypasses X-Frame-Options */}
      <div className="flex-1 min-h-0">
        <webview
          src={currentUrl}
          style={{ width: '100%', height: '100%' }}
          /* @ts-ignore — webview is Electron-specific, not in React typings */
          allowpopups="true"
        />
      </div>
    </div>
  );
}
