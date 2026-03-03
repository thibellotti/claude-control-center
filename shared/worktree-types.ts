export interface WorktreeSession {
  id: string;
  projectPath: string;
  worktreePath: string;
  branchName: string;
  baseBranch: string;
  ptySessionId?: string;
  status: 'active' | 'completed' | 'merged' | 'abandoned';
  createdAt: number;
  completedAt?: number;
  diffSummary?: { filesChanged: number; insertions: number; deletions: number };
}
