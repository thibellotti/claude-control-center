import React from 'react';
import { useVercel } from '../../hooks/useVercel';
import { VercelIcon, RefreshIcon, SpinnerIcon, ExternalLinkIcon } from '../icons';

interface VercelPanelProps {
  projectPath: string;
}

function statusColor(state: string): string {
  const upper = state.toUpperCase();
  if (upper === 'READY') return 'bg-status-active';
  if (upper === 'BUILDING' || upper === 'INITIALIZING') return 'bg-status-dirty';
  if (upper === 'ERROR' || upper === 'CANCELED') return 'bg-feedback-error';
  return 'bg-text-tertiary/40';
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function VercelPanel({ projectPath }: VercelPanelProps) {
  const { data, loading, deploying, refresh, deploy } = useVercel(projectPath);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-text-tertiary">
        <SpinnerIcon />
        <span className="text-xs">Checking Vercel...</span>
      </div>
    );
  }

  if (!data?.projectInfo.detected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
        <div className="text-text-tertiary/30"><VercelIcon /></div>
        <p className="text-sm text-text-secondary text-center">Vercel not detected</p>
        <p className="text-xs text-text-tertiary text-center">
          Run <code className="px-1 py-0.5 bg-surface-2 rounded text-micro">vercel</code> in your project to link it
        </p>
      </div>
    );
  }

  const { projectInfo, deployments, deployConfig } = data;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-text-primary"><VercelIcon /></span>
          <span className="text-sm font-medium text-text-primary">Vercel</span>
          {projectInfo.framework && (
            <span className="px-1.5 py-0.5 bg-surface-2 rounded text-micro text-text-tertiary">{projectInfo.framework}</span>
          )}
        </div>
        <button onClick={refresh} className="p-1.5 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors" title="Refresh">
          <RefreshIcon />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Production URL */}
        {projectInfo.productionUrl && (
          <div>
            <h3 className="text-micro font-medium text-text-tertiary uppercase tracking-wider mb-2">Production</h3>
            <a
              href={projectInfo.productionUrl.startsWith('http') ? projectInfo.productionUrl : `https://${projectInfo.productionUrl}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors truncate"
            >
              {projectInfo.productionUrl}
              <ExternalLinkIcon size={12} />
            </a>
          </div>
        )}

        {/* Deploy Button */}
        <button
          onClick={deploy}
          disabled={deploying}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-button text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-60"
        >
          {deploying ? (
            <>
              <SpinnerIcon size={14} />
              Deploying...
            </>
          ) : (
            'Deploy to Production'
          )}
        </button>

        {/* Recent Deployments */}
        {deployments.length > 0 && (
          <div>
            <h3 className="text-micro font-medium text-text-tertiary uppercase tracking-wider mb-2">
              Recent Deployments
            </h3>
            <div className="space-y-1">
              {deployments.slice(0, 8).map((d, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor(d.state)}`} />
                  <span className="text-text-secondary truncate flex-1 font-mono">{d.url}</span>
                  <span className="text-text-tertiary text-micro shrink-0">{relativeTime(d.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Deploy from History */}
        {deployConfig.lastDeployUrl && (
          <div>
            <h3 className="text-micro font-medium text-text-tertiary uppercase tracking-wider mb-2">Last Deploy</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${deployConfig.lastDeployStatus === 'success' ? 'bg-status-active' : 'bg-feedback-error'}`} />
              <a
                href={deployConfig.lastDeployUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:text-accent-hover truncate"
              >
                {deployConfig.lastDeployUrl}
              </a>
            </div>
          </div>
        )}

        {/* Open Dashboard */}
        <button
          onClick={() => window.open('https://vercel.com/dashboard', '_blank')}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-button text-xs font-medium bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
        >
          Open Vercel Dashboard
        </button>
      </div>
    </div>
  );
}
