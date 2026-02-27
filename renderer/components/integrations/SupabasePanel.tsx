import React, { useState } from 'react';
import { useSupabase } from '../../hooks/useSupabase';

interface SupabasePanelProps {
  projectPath: string;
}

// -- Icons (inline SVG, no icon library) --

function SupabaseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9.2 15.4c-.4.5-1.2.1-1.2-.5V9.6h5.6c1 0 1.5 1.1.9 1.8L9.2 15.4z"
        fill="#3ECF8E"
      />
      <path
        d="M9.2 15.4c-.4.5-1.2.1-1.2-.5V9.6h5.6c1 0 1.5 1.1.9 1.8L9.2 15.4z"
        fill="url(#sb-grad)"
        fillOpacity="0.2"
      />
      <path
        d="M6.8.6c.4-.5 1.2-.1 1.2.5v5.3H2.4c-1 0-1.5-1.1-.9-1.8L6.8.6z"
        fill="#3ECF8E"
      />
      <defs>
        <linearGradient id="sb-grad" x1="8" y1="9.6" x2="12" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#249361" />
          <stop offset="1" stopColor="#3ECF8E" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M11.5 2.5A5.5 5.5 0 1 0 12.9 8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path d="M11.5 0.5v2h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 4V2.5A1 1 0 007 1.5H2.5A1 1 0 001.5 2.5V7A1 1 0 002.5 8H4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 6.5L5 9l4.5-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 2H3a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 2h3v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 2L5.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 3.5A1 1 0 013 2.5h2.5l1.5 1.5H11a1 1 0 011 1v5.5a1 1 0 01-1 1H3a1 1 0 01-1-1V3.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <path d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// -- Status indicator dot --

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
        active ? 'bg-status-active' : 'bg-surface-3'
      }`}
    />
  );
}

// -- Main component --

export default function SupabasePanel({ projectPath }: SupabasePanelProps) {
  const { info, loading, refresh } = useSupabase(projectPath);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleCopy = async () => {
    if (!info?.projectUrl) return;
    try {
      await navigator.clipboard.writeText(info.projectUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access may be restricted
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="py-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-border-subtle border-t-accent rounded-full animate-spin" />
        </div>
        <p className="text-xs text-text-tertiary text-center mt-2">
          Detecting Supabase integration...
        </p>
      </div>
    );
  }

  // No info or project doesn't use Supabase
  if (!info || !info.hasSupabase) {
    return (
      <div className="py-6 space-y-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 text-text-tertiary opacity-40">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M18.4 30.8c-.8 1-2.4.2-2.4-1V19.2h11.2c2 0 3 2.2 1.8 3.6L18.4 30.8z"
                fill="currentColor"
                opacity="0.5"
              />
              <path
                d="M13.6 1.2c.8-1 2.4-.2 2.4 1v10.6H4.8c-2 0-3-2.2-1.8-3.6L13.6 1.2z"
                fill="currentColor"
                opacity="0.5"
              />
            </svg>
          </div>
          <p className="text-sm text-text-secondary mb-1">
            This project doesn't use Supabase
          </p>
          <p className="text-xs text-text-tertiary max-w-sm">
            Add <span className="font-mono text-text-secondary">@supabase/supabase-js</span> to get started.
          </p>
          <div className="mt-6 bg-surface-1 border border-border-subtle rounded-lg p-4">
            <pre className="text-[11px] font-mono text-text-tertiary bg-surface-2 rounded px-3 py-2">
              npm install @supabase/supabase-js
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // Supabase detected -- show integration panel
  const envVarItems = [
    { label: 'SUPABASE_URL', found: info.envVars.hasUrl },
    { label: 'SUPABASE_ANON_KEY', found: info.envVars.hasAnonKey },
    { label: 'SUPABASE_SERVICE_KEY', found: info.envVars.hasServiceKey },
  ];

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SupabaseIcon />
          <h3 className="text-sm font-medium text-text-primary">Supabase</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface-2 border border-border-subtle rounded-button hover:bg-surface-3 transition-colors disabled:opacity-50"
        >
          {isRefreshing ? <Spinner /> : <RefreshIcon />}
          Refresh
        </button>
      </div>

      {/* Connection Status */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-text-secondary">Connection Status</h4>
        <div className="bg-surface-1 border border-border-subtle rounded-lg divide-y divide-border-subtle">
          {envVarItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-2.5">
              <StatusDot active={item.found} />
              <span className="text-xs font-mono text-text-secondary flex-1">
                {item.label}
              </span>
              <span
                className={`text-xs ${
                  item.found ? 'text-status-active' : 'text-text-tertiary'
                }`}
              >
                {item.found ? 'Found' : '\u2014'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Project URL */}
      {info.projectUrl && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-text-secondary">Project URL</h4>
          <div className="flex items-center gap-2 bg-surface-1 border border-border-subtle rounded-lg px-4 py-2.5">
            <span className="text-xs font-mono text-text-primary flex-1 truncate">
              {info.projectUrl}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors shrink-0"
              title="Copy URL"
            >
              {copied ? (
                <>
                  <span className="text-status-active"><CheckIcon /></span>
                  <span className="text-status-active">Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-text-secondary">Quick Actions</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface-2 border border-border-subtle rounded-button hover:bg-surface-3 transition-colors"
          >
            <ExternalLinkIcon />
            Open Dashboard
          </button>
          <button
            onClick={() => window.open('https://supabase.com/docs', '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface-2 border border-border-subtle rounded-button hover:bg-surface-3 transition-colors"
          >
            <ExternalLinkIcon />
            Open Docs
          </button>
        </div>
      </div>

      {/* Local Config */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-text-secondary">Local Config</h4>
        <div className="flex items-center gap-2 bg-surface-1 border border-border-subtle rounded-lg px-4 py-2.5">
          {info.hasLocalConfig ? (
            <>
              <span className="text-status-active"><FolderIcon /></span>
              <span className="text-xs text-text-secondary">
                <span className="font-mono">supabase/</span> directory found
              </span>
            </>
          ) : (
            <>
              <span className="text-text-tertiary"><FolderIcon /></span>
              <span className="text-xs text-text-tertiary">
                No local <span className="font-mono">supabase/</span> directory
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
