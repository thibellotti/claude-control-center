import React from 'react';
import { useGitHub } from '../../hooks/useGitHub';
import type { GitInfo, GitHubCommitInfo, GitHubPRInfo } from '../../../shared/types';

interface GitHubPanelProps {
  projectPath: string;
  gitInfo: GitInfo | null;
}

// -- Icons --

function GitBranchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="5" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 5.5V10.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M9.5 7C8 7 5 7 5 8.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.5 2.5V5.5H8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 11.5V8.5H5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 5.5A4.5 4.5 0 0 1 11.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10.5 8.5A4.5 4.5 0 0 1 2.5 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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

function CommitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 1V4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7 9.5V13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function PRIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="4" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 5V9" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 5V9" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 3.5L7 3.5C8.657 3.5 10 4.843 10 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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

// -- Helpers --

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return dateStr;

  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

function prStateColor(state: string): string {
  const s = state.toLowerCase();
  if (s === 'open') return 'text-status-active';
  if (s === 'merged') return 'text-[#DA77F2]';
  if (s === 'closed') return 'text-red-400';
  return 'text-text-tertiary';
}

function prStateBg(state: string): string {
  const s = state.toLowerCase();
  if (s === 'open') return 'bg-status-active/10';
  if (s === 'merged') return 'bg-[#DA77F2]/10';
  if (s === 'closed') return 'bg-red-400/10';
  return 'bg-surface-2';
}

// -- Sub-components --

function PRRow({ pr, onOpen }: { pr: GitHubPRInfo; onOpen: (n: number) => void }) {
  return (
    <button
      onClick={() => onOpen(pr.number)}
      className="w-full text-left px-4 py-3 hover:bg-surface-2 transition-colors group"
    >
      <div className="flex items-start gap-2">
        <span className="text-text-tertiary shrink-0 mt-0.5">
          <PRIcon />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary font-mono">#{pr.number}</span>
            <span className="text-xs text-text-primary truncate">{truncate(pr.title, 50)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-text-tertiary">by {pr.author}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${prStateColor(pr.state)} ${prStateBg(pr.state)}`}>
              {pr.state.toLowerCase()}
            </span>
            <span className="text-[10px] text-text-tertiary">{formatRelativeTime(pr.updatedAt)}</span>
          </div>
        </div>
        <span className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
          <ExternalLinkIcon />
        </span>
      </div>
    </button>
  );
}

function CommitRow({ commit, owner, repo }: { commit: GitHubCommitInfo; owner: string; repo: string }) {
  const shortHash = commit.hash.slice(0, 7);

  return (
    <button
      onClick={() => window.open(`https://github.com/${owner}/${repo}/commit/${commit.hash}`, '_blank')}
      className="w-full text-left px-4 py-3 hover:bg-surface-2 transition-colors group"
    >
      <div className="flex items-start gap-2">
        <span className="text-text-tertiary shrink-0 mt-0.5">
          <CommitIcon />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-accent font-mono">{shortHash}</span>
            <span className="text-xs text-text-primary truncate">{truncate(commit.message, 50)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-text-tertiary">{commit.author}</span>
            <span className="text-[10px] text-text-tertiary">{formatRelativeTime(commit.date)}</span>
          </div>
        </div>
        <span className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
          <ExternalLinkIcon />
        </span>
      </div>
    </button>
  );
}

// -- Main Component --

export default function GitHubPanel({ projectPath, gitInfo }: GitHubPanelProps) {
  const { detected, repoInfo, loading, refresh, openRepo, openPR } = useGitHub(projectPath, gitInfo);

  // Loading state
  if (loading && !repoInfo) {
    return (
      <div className="py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-text-secondary">
            <GitBranchIcon />
            <h2 className="text-sm font-medium text-text-primary">GitHub</h2>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-border-subtle border-t-accent rounded-full animate-spin" />
        </div>
        <p className="text-xs text-text-tertiary text-center mt-2">
          Fetching GitHub info...
        </p>
      </div>
    );
  }

  // No git repo at all
  if (!gitInfo) {
    return (
      <div className="py-6">
        <div className="flex items-center gap-2 text-text-secondary mb-6">
          <GitBranchIcon />
          <h2 className="text-sm font-medium text-text-primary">GitHub</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 text-text-tertiary opacity-40">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="10" cy="24" r="3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="22" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 11V21" stroke="currentColor" strokeWidth="1.5" />
              <path d="M19 14C14 14 10 14 10 17" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary mb-1">Not a git repository</p>
          <p className="text-xs text-text-tertiary max-w-xs">
            Initialize a git repository to see GitHub info.
          </p>
        </div>
      </div>
    );
  }

  // No GitHub remote detected
  if (!detected || !repoInfo) {
    return (
      <div className="py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-text-secondary">
            <GitBranchIcon />
            <h2 className="text-sm font-medium text-text-primary">GitHub</h2>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            {loading ? <Spinner /> : <RefreshIcon />}
            Refresh
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 text-text-tertiary opacity-40">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="10" cy="24" r="3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="22" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 11V21" stroke="currentColor" strokeWidth="1.5" />
              <path d="M19 14C14 14 10 14 10 17" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary mb-1">No GitHub remote found</p>
          <p className="text-xs text-text-tertiary max-w-xs">
            Add a remote with <code className="font-mono bg-surface-2 px-1.5 py-0.5 rounded text-[11px]">git remote add origin &lt;url&gt;</code> to see GitHub info.
          </p>
        </div>
      </div>
    );
  }

  // Full GitHub panel
  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-secondary">
          <GitBranchIcon />
          <h2 className="text-sm font-medium text-text-primary">GitHub</h2>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-50"
        >
          {loading ? <Spinner /> : <RefreshIcon />}
          Refresh
        </button>
      </div>

      {/* Repo info card */}
      <div className="bg-surface-1 border border-border-subtle rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={openRepo}
            className="text-sm font-medium text-accent hover:underline flex items-center gap-1.5"
          >
            {repoInfo.owner}/{repoInfo.repo}
            <ExternalLinkIcon />
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="text-text-tertiary"><GitBranchIcon /></span>
            <span>{gitInfo.branch}</span>
          </div>
          <span className="text-border-subtle">|</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                gitInfo.status === 'clean' ? 'bg-status-active' : 'bg-status-dirty'
              }`}
            />
            <span>{gitInfo.status}</span>
          </div>
        </div>
        {(gitInfo.ahead > 0 || gitInfo.behind > 0) && (
          <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
            <span>&#8593; {gitInfo.ahead} ahead</span>
            <span>&#8595; {gitInfo.behind} behind</span>
          </div>
        )}
        {gitInfo.ahead === 0 && gitInfo.behind === 0 && (
          <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
            <span>&#8593; 0 ahead</span>
            <span>&#8595; 0 behind</span>
          </div>
        )}
      </div>

      {/* Pull Requests */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-text-secondary">Open Pull Requests</h3>
        {repoInfo.pullRequests.length > 0 ? (
          <div className="bg-surface-1 border border-border-subtle rounded-lg divide-y divide-border-subtle overflow-hidden">
            {repoInfo.pullRequests.map((pr) => (
              <PRRow key={pr.number} pr={pr} onOpen={openPR} />
            ))}
          </div>
        ) : (
          <div className="bg-surface-1 border border-border-subtle rounded-lg px-4 py-6 text-center">
            <p className="text-xs text-text-tertiary">No open pull requests</p>
          </div>
        )}
      </div>

      {/* Recent Commits */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-text-secondary">Recent Commits</h3>
        {repoInfo.commits.length > 0 ? (
          <div className="bg-surface-1 border border-border-subtle rounded-lg divide-y divide-border-subtle overflow-hidden">
            {repoInfo.commits.map((commit) => (
              <CommitRow
                key={commit.hash}
                commit={commit}
                owner={repoInfo.owner}
                repo={repoInfo.repo}
              />
            ))}
          </div>
        ) : (
          <div className="bg-surface-1 border border-border-subtle rounded-lg px-4 py-6 text-center">
            <p className="text-xs text-text-tertiary">No commits found</p>
          </div>
        )}
      </div>
    </div>
  );
}
