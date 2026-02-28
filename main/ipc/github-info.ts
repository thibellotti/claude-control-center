import { ipcMain } from 'electron';
import { promisify } from 'util';
import { IPC_CHANNELS, GitHubRepoInfo, GitHubCommitInfo, GitHubPRInfo } from '../../shared/types';

const execAsync = promisify(require('child_process').exec);

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
}
