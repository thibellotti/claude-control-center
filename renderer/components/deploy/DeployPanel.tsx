import React, { useRef, useEffect } from 'react';
import { useDeploy } from '../../hooks/useDeploy';
import type { DeployResult } from '../../../shared/types';
import { VercelIcon, NetlifyIcon, RocketIcon, ExternalLinkIcon, SpinnerIcon } from '../icons';

interface DeployPanelProps {
  projectPath: string;
}

function StatusDot({ success }: { success: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
        success ? 'bg-feedback-success' : 'bg-feedback-error'
      }`}
    />
  );
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// -- Main Component --

export default function DeployPanel({ projectPath }: DeployPanelProps) {
  const {
    config,
    isDetecting,
    isDeploying,
    result,
    history,
    error,
    deploy,
  } = useDeploy(projectPath);

  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output log to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [result?.output]);

  const providerLabel = config.provider === 'vercel' ? 'Vercel' : config.provider === 'netlify' ? 'Netlify' : null;

  const ProviderIcon = config.provider === 'vercel' ? VercelIcon : config.provider === 'netlify' ? NetlifyIcon : null;

  // Loading state while detecting
  if (isDetecting) {
    return (
      <div className="py-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-border-subtle border-t-accent rounded-full animate-spin" />
        </div>
        <p className="text-xs text-text-tertiary text-center mt-2">
          Detecting deployment provider...
        </p>
      </div>
    );
  }

  // No provider detected
  if (config.provider === 'none') {
    return (
      <div className="py-6 space-y-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 text-text-tertiary opacity-40">
            <RocketIcon />
          </div>
          <p className="text-sm text-text-secondary mb-1">
            No deployment provider detected
          </p>
          <p className="text-xs text-text-tertiary mb-6 max-w-sm">
            Install the Vercel or Netlify CLI and authenticate to enable one-click deploys from this panel.
          </p>
          <div className="space-y-3 text-left">
            <div className="bg-surface-1 border border-border-subtle rounded-lg p-4">
              <p className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-2">
                <VercelIcon /> Vercel
              </p>
              <pre className="text-[11px] font-mono text-text-tertiary bg-surface-2 rounded px-3 py-2">
                npm i -g vercel{'\n'}vercel login
              </pre>
            </div>
            <div className="bg-surface-1 border border-border-subtle rounded-lg p-4">
              <p className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-2">
                <NetlifyIcon /> Netlify
              </p>
              <pre className="text-[11px] font-mono text-text-tertiary bg-surface-2 rounded px-3 py-2">
                npm i -g netlify-cli{'\n'}netlify login
              </pre>
            </div>
          </div>
          {error && (
            <p className="text-xs text-feedback-error mt-4">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Provider detected -- show deploy UI
  return (
    <div className="py-6 space-y-6">
      {/* Provider info + deploy button */}
      <div className="bg-surface-1 border border-border-subtle rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {ProviderIcon && (
              <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary">
                <ProviderIcon />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-text-primary">
                {providerLabel}
              </p>
              {config.lastDeployUrl && (
                <button
                  onClick={() => window.open(config.lastDeployUrl, '_blank')}
                  className="text-xs text-accent hover:underline flex items-center gap-1 mt-0.5"
                >
                  {config.lastDeployUrl}
                  <ExternalLinkIcon size={12} />
                </button>
              )}
              {config.lastDeployTime && !config.lastDeployUrl && (
                <p className="text-xs text-text-tertiary mt-0.5">
                  Last deploy: {formatTimestamp(config.lastDeployTime)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={deploy}
            disabled={isDeploying}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeploying ? (
              <>
                <SpinnerIcon />
                Deploying...
              </>
            ) : (
              <>Deploy to {providerLabel}</>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="px-3 py-2 bg-feedback-error-muted border border-feedback-error-border rounded-lg">
          <span className="text-xs text-feedback-error">{error}</span>
        </div>
      )}

      {/* Deploy output log (visible while deploying or after completion) */}
      {(isDeploying || result) && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-text-secondary">
            {isDeploying ? 'Deploy output' : 'Last deploy output'}
          </h3>
          <div
            ref={outputRef}
            className="bg-surface-2 border border-border-subtle rounded-lg p-3 max-h-48 overflow-y-auto"
          >
            {result && result.output.length > 0 ? (
              <pre className="text-[11px] font-mono text-text-tertiary leading-relaxed whitespace-pre-wrap break-all">
                {result.output.join('')}
              </pre>
            ) : isDeploying ? (
              <p className="text-[11px] font-mono text-text-tertiary">Waiting for output...</p>
            ) : (
              <p className="text-[11px] font-mono text-text-tertiary">No output captured.</p>
            )}
          </div>
        </div>
      )}

      {/* Result banner */}
      {result && !isDeploying && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
            result.success
              ? 'bg-feedback-success-muted border-feedback-success-border'
              : 'bg-feedback-error-muted border-feedback-error-border'
          }`}
        >
          <StatusDot success={result.success} />
          <div className="flex-1 min-w-0">
            {result.success ? (
              <p className="text-xs text-feedback-success">
                Deploy successful
              </p>
            ) : (
              <p className="text-xs text-feedback-error">
                Deploy failed{result.error ? `: ${result.error}` : ''}
              </p>
            )}
            {result.url && (
              <button
                onClick={() => window.open(result.url, '_blank')}
                className="text-xs text-accent hover:underline flex items-center gap-1 mt-1"
              >
                {result.url}
                <ExternalLinkIcon size={12} />
              </button>
            )}
            <p className="text-micro text-text-tertiary mt-1">
              {formatTimestamp(result.timestamp)}
            </p>
          </div>
        </div>
      )}

      {/* Deploy history */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-text-secondary">Deploy history</h3>
          <div className="bg-surface-1 border border-border-subtle rounded-lg divide-y divide-border-subtle">
            {history.map((entry: DeployResult, i: number) => (
              <DeployHistoryEntry key={`${entry.timestamp}-${i}`} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -- Sub-components --

function DeployHistoryEntry({ entry }: { entry: DeployResult }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <StatusDot success={entry.success} />
      <div className="flex-1 min-w-0">
        {entry.url ? (
          <button
            onClick={() => window.open(entry.url, '_blank')}
            className="text-xs text-accent hover:underline flex items-center gap-1 truncate"
          >
            <span className="truncate">{entry.url}</span>
            <span className="shrink-0"><ExternalLinkIcon size={12} /></span>
          </button>
        ) : (
          <p className="text-xs text-text-tertiary truncate">
            {entry.success ? 'Deployed (no URL captured)' : entry.error || 'Deploy failed'}
          </p>
        )}
      </div>
      <span className="text-micro text-text-tertiary whitespace-nowrap shrink-0">
        {formatTimestamp(entry.timestamp)}
      </span>
    </div>
  );
}
