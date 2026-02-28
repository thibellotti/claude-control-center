import React from 'react';
import { useGitHub } from '../../hooks/useGitHub';
import type { Project } from '../../../shared/types';
import { GitHubIcon, RefreshIcon, SpinnerIcon, ExternalLinkIcon, CommitIcon, PRIcon } from '../icons';

interface GitHubPanelProps {
  projectPath: string;
  project: Project;
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

function prStateColor(state: string): string {
  if (state === 'OPEN') return 'text-status-active';
  if (state === 'MERGED') return 'text-feedback-info';
  return 'text-text-tertiary';
}

export default function GitHubPanel({ projectPath, project }: GitHubPanelProps) {
  const { data, loading, refresh } = useGitHub(projectPath);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-text-tertiary">
        <SpinnerIcon />
        <span className="text-xs">Loading GitHub info...</span>
      </div>
    );
  }

  if (!data || 'detected' in data && !data.detected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
        <div className="text-text-tertiary/30"><GitHubIcon /></div>
        <p className="text-sm text-text-secondary text-center">GitHub remote not detected</p>
        <p className="text-xs text-text-tertiary text-center">
          Add a GitHub remote to enable this panel
        </p>
      </div>
    );
  }

  if (!('owner' in data)) return null;

  const repoUrl = `https://github.com/${data.owner}/${data.repo}`;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-text-primary"><GitHubIcon size={18} /></span>
          <a href={repoUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-text-primary hover:text-accent transition-colors">
            {data.owner}/{data.repo}
          </a>
        </div>
        <button onClick={refresh} className="p-1.5 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors" title="Refresh">
          <RefreshIcon />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Git Status */}
        {project.git && (
          <div>
            <h3 className="text-micro font-medium text-text-tertiary uppercase tracking-wider mb-2">Status</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-surface-2 rounded text-xs text-text-secondary font-mono">
                {project.git.branch}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-micro ${project.git.status === 'clean' ? 'bg-status-active/15 text-status-active' : 'bg-status-dirty/15 text-status-dirty'}`}>
                {project.git.status}
              </span>
              {project.git.ahead > 0 && (
                <span className="text-micro text-text-tertiary">{project.git.ahead} ahead</span>
              )}
              {project.git.behind > 0 && (
                <span className="text-micro text-text-tertiary">{project.git.behind} behind</span>
              )}
            </div>
          </div>
        )}

        {/* Recent Commits */}
        {data.commits.length > 0 && (
          <div>
            <h3 className="text-micro font-medium text-text-tertiary uppercase tracking-wider mb-2">
              Recent Commits
            </h3>
            <div className="space-y-1">
              {data.commits.slice(0, 6).map((commit) => (
                <div key={commit.hash} className="flex items-start gap-2 py-1">
                  <span className="text-text-tertiary mt-0.5 shrink-0"><CommitIcon size={12} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary truncate">{commit.message}</p>
                    <p className="text-micro text-text-tertiary">
                      <span className="font-mono">{commit.hash.slice(0, 7)}</span>
                      {' '}&middot;{' '}{commit.author}
                      {commit.date && <>{' '}&middot;{' '}{relativeTime(commit.date)}</>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pull Requests */}
        {data.pullRequests.length > 0 && (
          <div>
            <h3 className="text-micro font-medium text-text-tertiary uppercase tracking-wider mb-2">
              Pull Requests
            </h3>
            <div className="space-y-1">
              {data.pullRequests.map((pr) => (
                <a
                  key={pr.number}
                  href={pr.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-2 py-1.5 hover:bg-surface-2 rounded px-1 -mx-1 transition-colors"
                >
                  <span className="text-text-tertiary mt-0.5 shrink-0"><PRIcon size={12} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary truncate">
                      <span className={prStateColor(pr.state)}>#{pr.number}</span>{' '}
                      {pr.title}
                    </p>
                    <p className="text-micro text-text-tertiary">
                      {pr.author}{' '}&middot;{' '}{relativeTime(pr.updatedAt)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-2 pt-2">
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-button text-xs font-medium bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
          >
            Open Repository
            <ExternalLinkIcon size={12} />
          </a>
          <a
            href={`${repoUrl}/pulls`}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-button text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            View All PRs
          </a>
        </div>
      </div>
    </div>
  );
}
