import React, { useState, useCallback } from 'react';
import { useGitHub } from '../../hooks/useGitHub';
import type { PRDetail, PRCheck } from '../../../shared/types';
import { PRIcon, PlusIcon, RefreshIcon, SpinnerIcon, ChevronDownIcon, ChevronRightIcon, ExternalLinkIcon } from '../icons';
import CreatePRDialog from './CreatePRDialog';

interface PRListPanelProps {
  projectPath: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function stateBadge(state: string) {
  const normalized = state.toUpperCase();
  if (normalized === 'OPEN') return { label: 'Open', className: 'bg-status-active/15 text-status-active' };
  if (normalized === 'MERGED') return { label: 'Merged', className: 'bg-feedback-info/15 text-feedback-info' };
  return { label: 'Closed', className: 'bg-text-tertiary/15 text-text-tertiary' };
}

function checkDot(check: PRCheck) {
  if (check.status === 'in_progress') return 'bg-yellow-400';
  if (check.status === 'queued') return 'bg-neutral-400';
  if (check.conclusion === 'success') return 'bg-status-active';
  if (check.conclusion === 'failure') return 'bg-feedback-error';
  return 'bg-neutral-400';
}

function PRDetailView({ detail }: { detail: PRDetail }) {
  return (
    <div className="mt-2 space-y-3 pl-6 pr-2 pb-2">
      {/* Stats */}
      <div className="flex items-center gap-3 text-micro text-text-tertiary">
        <span className="text-status-active">+{detail.additions}</span>
        <span className="text-feedback-error">-{detail.deletions}</span>
        <span>{detail.changedFiles} file{detail.changedFiles !== 1 ? 's' : ''}</span>
        {detail.reviewDecision && (
          <span className="px-1.5 py-0.5 bg-surface-2 rounded text-micro">
            {detail.reviewDecision.replace(/_/g, ' ').toLowerCase()}
          </span>
        )}
      </div>

      {/* Branch info */}
      <div className="flex items-center gap-1.5 text-micro text-text-tertiary">
        <span className="font-mono bg-surface-2 px-1.5 py-0.5 rounded">{detail.branch}</span>
        <span>-&gt;</span>
        <span className="font-mono bg-surface-2 px-1.5 py-0.5 rounded">{detail.baseBranch}</span>
      </div>

      {/* Body */}
      {detail.body && (
        <div className="text-xs text-text-secondary whitespace-pre-wrap break-words bg-surface-2 rounded-card p-3 max-h-32 overflow-y-auto">
          {detail.body}
        </div>
      )}

      {/* Checks */}
      {detail.checks.length > 0 && (
        <div>
          <p className="text-micro font-medium text-text-tertiary uppercase tracking-wider mb-1.5">CI Checks</p>
          <div className="space-y-1">
            {detail.checks.map((check, i) => (
              <div key={i} className="flex items-center gap-2 text-micro text-text-secondary">
                <span className={`w-2 h-2 rounded-full shrink-0 ${checkDot(check)}`} />
                <span className="truncate">{check.name}</span>
                {check.conclusion && (
                  <span className="text-text-tertiary ml-auto shrink-0">{check.conclusion}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link */}
      <a
        href={detail.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-micro text-accent hover:text-accent/80 transition-colors"
      >
        View on GitHub <ExternalLinkIcon size={10} />
      </a>
    </div>
  );
}

export default function PRListPanel({ projectPath }: PRListPanelProps) {
  const { data, loading, refresh, getPRDetail } = useGitHub(projectPath);
  const [expandedPR, setExpandedPR] = useState<number | null>(null);
  const [prDetail, setPrDetail] = useState<PRDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const togglePR = useCallback(async (prNumber: number) => {
    if (expandedPR === prNumber) {
      setExpandedPR(null);
      setPrDetail(null);
      return;
    }
    setExpandedPR(prNumber);
    setDetailLoading(true);
    const detail = await getPRDetail(prNumber);
    setPrDetail(detail);
    setDetailLoading(false);
  }, [expandedPR, getPRDetail]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-tertiary">
        <SpinnerIcon />
        <span className="text-xs">Loading pull requests...</span>
      </div>
    );
  }

  if (!data || ('detected' in data && !data.detected) || !('pullRequests' in data)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 px-6">
        <div className="text-text-tertiary/30"><PRIcon size={20} /></div>
        <p className="text-xs text-text-tertiary text-center">No GitHub remote detected</p>
      </div>
    );
  }

  const { pullRequests } = data;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <h3 className="text-micro font-medium text-text-tertiary uppercase tracking-wider">
          Pull Requests
          {pullRequests.length > 0 && (
            <span className="ml-1.5 text-text-secondary">{pullRequests.length}</span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            className="p-1 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
            title="Refresh"
          >
            <RefreshIcon size={12} />
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="p-1 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
            title="Create PR"
          >
            <PlusIcon size={12} />
          </button>
        </div>
      </div>

      {/* PR List */}
      {pullRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="text-text-tertiary/30"><PRIcon size={16} /></div>
          <p className="text-xs text-text-tertiary">No pull requests</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-1 px-3 py-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
          >
            Create Pull Request
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {pullRequests.map((pr) => {
            const badge = stateBadge(pr.state);
            const isExpanded = expandedPR === pr.number;
            return (
              <div key={pr.number}>
                <button
                  onClick={() => togglePR(pr.number)}
                  className="w-full flex items-start gap-2 px-4 py-2.5 hover:bg-surface-1 transition-colors text-left"
                >
                  <span className="text-text-tertiary mt-0.5 shrink-0">
                    {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-micro font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-text-secondary truncate">
                        <span className="text-text-tertiary">#{pr.number}</span>{' '}
                        {pr.title}
                      </span>
                    </div>
                    <p className="text-micro text-text-tertiary mt-0.5">
                      {pr.author} &middot; {relativeTime(pr.updatedAt)}
                    </p>
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  detailLoading ? (
                    <div className="flex items-center gap-2 pl-8 py-3 text-text-tertiary">
                      <SpinnerIcon size={12} />
                      <span className="text-micro">Loading details...</span>
                    </div>
                  ) : prDetail && prDetail.number === pr.number ? (
                    <PRDetailView detail={prDetail} />
                  ) : null
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create PR Dialog */}
      <CreatePRDialog
        projectPath={projectPath}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          refresh();
        }}
      />
    </div>
  );
}
