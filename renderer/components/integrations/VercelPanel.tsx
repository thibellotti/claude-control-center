import React from 'react';
import { useVercel } from '../../hooks/useVercel';
import type { VercelDeployment } from '../../../shared/types';

interface VercelPanelProps {
  projectPath: string;
}

// -- Icons --

function VercelTriangleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 1L13 13H1L7 1Z" fill="currentColor" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M11.5 7A4.5 4.5 0 1 1 7 2.5M7 2.5V5.5M7 2.5L9.5 4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5 2H3a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7 2h3v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 2L5.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// -- Helpers --

function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diffMs = now - ts;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function normalizeState(state: string): string {
  const s = state.toUpperCase();
  if (s === 'READY' || s === 'SUCCEEDED') return 'READY';
  if (s === 'BUILDING' || s === 'INITIALIZING' || s === 'DEPLOYING') return 'BUILDING';
  if (s === 'ERROR' || s === 'FAILED' || s === 'CANCELED' || s === 'CANCELLED') return 'ERROR';
  if (s === 'QUEUED') return 'QUEUED';
  return s;
}

function stateLabel(state: string): string {
  const n = normalizeState(state);
  switch (n) {
    case 'READY': return 'Ready';
    case 'BUILDING': return 'Building';
    case 'ERROR': return 'Error';
    case 'QUEUED': return 'Queued';
    default: return state;
  }
}

// -- Sub-components --

function StatusIndicator({ state }: { state: string }) {
  const normalized = normalizeState(state);

  let colorClass = 'bg-gray-400'; // default/queued
  if (normalized === 'READY') colorClass = 'bg-emerald-400';
  if (normalized === 'BUILDING') colorClass = 'bg-yellow-400';
  if (normalized === 'ERROR') colorClass = 'bg-[#FF6B6B]';

  return (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${colorClass}`} />
  );
}

function DeploymentRow({ deployment }: { deployment: VercelDeployment }) {
  const displayUrl = deployment.url.replace(/^https?:\/\//, '');
  const fullUrl = deployment.url.startsWith('http') ? deployment.url : `https://${deployment.url}`;
  const sourceLabel = deployment.source ? `via ${deployment.source.charAt(0).toUpperCase() + deployment.source.slice(1)}` : '';

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="pt-1">
        <StatusIndicator state={deployment.state} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">
            {stateLabel(deployment.state)}
          </span>
          <button
            onClick={() => window.open(fullUrl, '_blank')}
            className="text-xs text-accent hover:underline truncate flex items-center gap-1"
          >
            <span className="truncate">{displayUrl}</span>
            <span className="shrink-0"><ExternalLinkIcon /></span>
          </button>
        </div>
        <p className="text-[10px] text-text-tertiary mt-0.5">
          {formatRelativeTime(deployment.createdAt)}
          {sourceLabel && <span> &middot; {sourceLabel}</span>}
        </p>
      </div>
    </div>
  );
}

// -- Main Component --

export default function VercelPanel({ projectPath }: VercelPanelProps) {
  const {
    detected,
    projectInfo,
    deployments,
    loading,
    deploying,
    deploy,
    refresh,
  } = useVercel(projectPath);

  // Loading state
  if (loading) {
    return (
      <div className="bg-surface-1 border border-border-subtle rounded-lg">
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-border-subtle border-t-accent rounded-full animate-spin" />
        </div>
        <p className="text-xs text-text-tertiary text-center pb-4">
          Checking Vercel integration...
        </p>
      </div>
    );
  }

  // Not detected — empty state
  if (!detected) {
    return (
      <div className="bg-surface-1 border border-border-subtle rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-text-tertiary">
            <VercelTriangleIcon />
          </div>
          <h3 className="text-sm font-medium text-text-primary">Vercel</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 text-text-tertiary opacity-40">
            <VercelTriangleIcon size={32} />
          </div>
          <p className="text-sm text-text-secondary mb-1">
            Vercel not detected
          </p>
          <p className="text-xs text-text-tertiary max-w-xs">
            Run <code className="font-mono bg-surface-2 px-1.5 py-0.5 rounded text-[11px]">vercel</code> in
            your project to set up deployment.
          </p>
        </div>
      </div>
    );
  }

  // Vercel detected — full panel
  const productionUrl = projectInfo?.productionUrl;
  const displayProductionUrl = productionUrl
    ? productionUrl.replace(/^https?:\/\//, '')
    : null;
  const fullProductionUrl = productionUrl
    ? (productionUrl.startsWith('http') ? productionUrl : `https://${productionUrl}`)
    : null;

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="text-text-primary">
            <VercelTriangleIcon />
          </div>
          <h3 className="text-sm font-medium text-text-primary">Vercel</h3>
          {projectInfo?.framework && (
            <span className="text-[10px] text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded">
              {projectInfo.framework}
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-1.5 rounded-button text-text-tertiary hover:text-text-secondary hover:bg-surface-2 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshIcon />
        </button>
      </div>

      {/* Production URL */}
      <div className="px-4 py-4 border-b border-border-subtle">
        <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-2">
          Production
        </p>
        {displayProductionUrl ? (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => fullProductionUrl && window.open(fullProductionUrl, '_blank')}
              className="text-sm text-accent hover:underline flex items-center gap-1.5 truncate"
            >
              <span className="truncate">{displayProductionUrl}</span>
              <span className="shrink-0"><ExternalLinkIcon /></span>
            </button>
          </div>
        ) : (
          <p className="text-xs text-text-tertiary">
            {projectInfo?.projectName || 'No production URL available'}
          </p>
        )}

        {/* Deploy button */}
        <button
          onClick={deploy}
          disabled={deploying}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deploying ? (
            <>
              <Spinner />
              Deploying...
            </>
          ) : (
            'Deploy to Production'
          )}
        </button>
      </div>

      {/* Recent Deployments */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-2">
          Recent Deployments
        </p>
      </div>

      {deployments.length > 0 ? (
        <div className="divide-y divide-border-subtle">
          {deployments.slice(0, 8).map((d, i) => (
            <DeploymentRow key={`${d.url}-${i}`} deployment={d} />
          ))}
        </div>
      ) : (
        <div className="px-4 pb-4">
          <p className="text-xs text-text-tertiary text-center py-4">
            No deployments found
          </p>
        </div>
      )}

      {/* Footer: Open Vercel Dashboard */}
      <div className="px-4 py-3 border-t border-border-subtle">
        <button
          onClick={() => {
            const dashUrl = projectInfo?.projectName
              ? `https://vercel.com/~/projects/${projectInfo.projectName}`
              : 'https://vercel.com/dashboard';
            window.open(dashUrl, '_blank');
          }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors border border-border-subtle"
        >
          Open Vercel Dashboard
          <ExternalLinkIcon />
        </button>
      </div>
    </div>
  );
}
