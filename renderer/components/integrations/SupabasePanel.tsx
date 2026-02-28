import React, { useState } from 'react';
import { useSupabase } from '../../hooks/useSupabase';
import { SupabaseIcon, RefreshIcon, SpinnerIcon } from '../icons';

interface SupabasePanelProps {
  projectPath: string;
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-status-active' : 'bg-text-tertiary/30'}`} />
  );
}

export default function SupabasePanel({ projectPath }: SupabasePanelProps) {
  const { info, loading, refresh } = useSupabase(projectPath);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-text-tertiary">
        <SpinnerIcon size={16} />
        <span className="text-xs">Detecting Supabase...</span>
      </div>
    );
  }

  if (!info?.hasSupabase) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
        <div className="opacity-30"><SupabaseIcon size={18} /></div>
        <p className="text-sm text-text-secondary text-center">Supabase not detected</p>
        <p className="text-xs text-text-tertiary text-center">
          Add <code className="px-1 py-0.5 bg-surface-2 rounded text-micro">@supabase/supabase-js</code> to use this panel
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <SupabaseIcon size={18} />
          <span className="text-sm font-medium text-text-primary">Supabase</span>
        </div>
        <button onClick={refresh} className="p-1.5 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors" title="Refresh">
          <RefreshIcon />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Environment Variables */}
        <div>
          <h3 className="text-micro font-medium text-text-tertiary uppercase tracking-wider mb-2">Environment</h3>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <StatusDot active={info.envVars.hasUrl} />
              <span className="text-text-secondary font-mono">SUPABASE_URL</span>
              {info.envVars.hasUrl && <span className="text-status-active text-micro">Found</span>}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <StatusDot active={info.envVars.hasAnonKey} />
              <span className="text-text-secondary font-mono">SUPABASE_ANON_KEY</span>
              {info.envVars.hasAnonKey && <span className="text-status-active text-micro">Found</span>}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <StatusDot active={info.envVars.hasServiceKey} />
              <span className="text-text-secondary font-mono">SERVICE_KEY</span>
              {info.envVars.hasServiceKey && <span className="text-status-active text-micro">Found</span>}
            </div>
          </div>
        </div>

        {/* Project URL */}
        {info.projectUrl && (
          <div>
            <h3 className="text-micro font-medium text-text-tertiary uppercase tracking-wider mb-2">Project</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-text-secondary truncate flex-1">{info.projectUrl}</span>
              <button
                onClick={() => handleCopy(info.projectUrl!)}
                className="text-micro text-text-tertiary hover:text-text-primary transition-colors shrink-0"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Local Config */}
        <div>
          <h3 className="text-micro font-medium text-text-tertiary uppercase tracking-wider mb-2">Local Setup</h3>
          <div className="flex items-center gap-2 text-xs">
            <StatusDot active={info.hasLocalConfig} />
            <span className="text-text-secondary">
              {info.hasLocalConfig ? 'Local config found (supabase/)' : 'No local config'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-button text-xs font-medium bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
          >
            Open Dashboard
          </button>
          <button
            onClick={() => window.open('https://supabase.com/docs', '_blank')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-button text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Documentation
          </button>
        </div>
      </div>
    </div>
  );
}
