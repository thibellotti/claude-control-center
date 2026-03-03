import { ipcMain } from 'electron';
import { promisify } from 'util';
import { execFile, exec } from 'child_process';
import { IPC_CHANNELS, GitHubRepoInfo, GitHubCommitInfo, GitHubPRInfo, PRDetail, PRCheck, CreatePROptions } from '../../shared/types';
import { isPathSafe } from '../helpers/path-safety';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

/**
 * Parse owner/repo from a GitHub remote URL.
 * Handles both HTTPS and SSH formats:
 *   https://github.com/owner/repo.git
 *   git@github.com:owner/repo.git
 */
function parseGitHubRemote(remoteUrl: string): { owner: string; repo: string } | null {
  // HTTPS format
  const httpsMatch = remoteUrl.match(/github\.com\/([^/]+)\/([^/\s]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // SSH format
  const sshMatch = remoteUrl.match(/github\.com:([^/]+)\/([^/\s]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return null;
}

export function registerGitHubHandlers() {
  ipcMain.handle(
    IPC_CHANNELS.GET_GITHUB_INFO,
    async (_event, projectPath: string): Promise<{ detected: false } | GitHubRepoInfo> => {
      if (!isPathSafe(projectPath)) return { detected: false };
      // Step 1: Get remote URL
      let remoteUrl: string;
      try {
        const { stdout } = await execAsync('git remote get-url origin', { cwd: projectPath });
        remoteUrl = stdout.trim();
      } catch {
        return { detected: false };
      }

      if (!remoteUrl) {
        return { detected: false };
      }

      // Step 2: Parse owner/repo from remote URL
      const parsed = parseGitHubRemote(remoteUrl);
      if (!parsed) {
        return { detected: false };
      }

      const { owner, repo } = parsed;

      // Step 3: Get recent commits from git log
      let commits: GitHubCommitInfo[] = [];
      try {
        const { stdout } = await execAsync(
          `git log --format='%H|||%s|||%an|||%aI' -10`,
          { cwd: projectPath }
        );
        const lines = stdout.trim().split('\n').filter(Boolean);
        commits = lines.map((line: string) => {
          const [hash, message, author, date] = line.split('|||');
          return {
            hash: hash || '',
            message: message || '',
            author: author || '',
            date: date || '',
          };
        });
      } catch {
        // If git log fails, return empty commits
      }

      // Step 4: Get pull requests via gh CLI
      let pullRequests: GitHubPRInfo[] = [];
      try {
        const { stdout } = await execAsync(
          'gh pr list --json number,title,state,author,updatedAt,url --limit 5 2>/dev/null',
          { cwd: projectPath }
        );
        const parsed = JSON.parse(stdout.trim());
        if (Array.isArray(parsed)) {
          pullRequests = parsed.map((pr: { number: number; title: string; state: string; author: { login: string }; updatedAt: string; url: string }) => ({
            number: pr.number,
            title: pr.title,
            state: pr.state,
            author: pr.author?.login || 'unknown',
            updatedAt: pr.updatedAt,
            url: pr.url,
          }));
        }
      } catch {
        // gh CLI not installed or failed — continue without PRs
      }

      return {
        owner,
        repo,
        remoteUrl,
        commits,
        pullRequests,
      };
    }
  );

  // GET_PR_DETAIL — fetch detailed info for a single PR
  ipcMain.handle(
    IPC_CHANNELS.GET_PR_DETAIL,
    async (_event, opts: { projectPath: string; prNumber: number }): Promise<PRDetail | null> => {
      if (!isPathSafe(opts.projectPath)) return null;
      try {
        const { stdout } = await execFileAsync('gh', [
          'pr', 'view', String(opts.prNumber),
          '--json', 'number,title,body,state,author,headRefName,baseRefName,url,createdAt,updatedAt,additions,deletions,changedFiles,reviewDecision,statusCheckRollup',
        ], { cwd: opts.projectPath });

        const raw = JSON.parse(stdout.trim());
        const checks: PRCheck[] = Array.isArray(raw.statusCheckRollup)
          ? raw.statusCheckRollup.map((c: { name: string; status: string; conclusion: string | null }) => ({
              name: c.name || '',
              status: (c.status || 'queued') as PRCheck['status'],
              conclusion: (c.conclusion || null) as PRCheck['conclusion'],
            }))
          : [];

        return {
          number: raw.number,
          title: raw.title || '',
          body: raw.body || '',
          state: raw.state === 'MERGED' ? 'merged' : raw.state === 'CLOSED' ? 'closed' : 'open',
          author: raw.author?.login || 'unknown',
          branch: raw.headRefName || '',
          baseBranch: raw.baseRefName || '',
          url: raw.url || '',
          createdAt: raw.createdAt || '',
          updatedAt: raw.updatedAt || '',
          additions: raw.additions ?? 0,
          deletions: raw.deletions ?? 0,
          changedFiles: raw.changedFiles ?? 0,
          reviewDecision: raw.reviewDecision || undefined,
          checks,
        };
      } catch {
        return null;
      }
    }
  );

  // CREATE_PR — create a new pull request from current branch
  ipcMain.handle(
    IPC_CHANNELS.CREATE_PR,
    async (_event, opts: CreatePROptions): Promise<{ url: string } | { error: string }> => {
      if (!isPathSafe(opts.projectPath)) return { error: 'Invalid project path' };
      try {
        const args = ['pr', 'create', '--title', opts.title, '--body', opts.body];
        if (opts.baseBranch) {
          args.push('--base', opts.baseBranch);
        }
        if (opts.draft) {
          args.push('--draft');
        }
        const { stdout } = await execFileAsync('gh', args, { cwd: opts.projectPath });
        return { url: stdout.trim() };
      } catch (err) {
        return { error: (err as Error).message || 'Failed to create PR' };
      }
    }
  );

  // GET_PR_CHECKS — fetch CI check statuses for a PR
  ipcMain.handle(
    IPC_CHANNELS.GET_PR_CHECKS,
    async (_event, opts: { projectPath: string; prNumber: number }): Promise<PRCheck[]> => {
      if (!isPathSafe(opts.projectPath)) return [];
      try {
        const { stdout } = await execFileAsync('gh', [
          'pr', 'checks', String(opts.prNumber),
          '--json', 'name,state,conclusion',
        ], { cwd: opts.projectPath });

        const parsed = JSON.parse(stdout.trim());
        if (!Array.isArray(parsed)) return [];
        return parsed.map((c: { name: string; state: string; conclusion: string | null }) => ({
          name: c.name || '',
          status: (c.state || 'queued') as PRCheck['status'],
          conclusion: (c.conclusion || null) as PRCheck['conclusion'],
        }));
      } catch {
        return [];
      }
    }
  );
}
