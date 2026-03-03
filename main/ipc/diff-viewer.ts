import { ipcMain } from 'electron';
import simpleGit from 'simple-git';
import { IPC_CHANNELS, FileDiffEntry, DiffResult } from '../../shared/types';

function parseDiffOutput(diffText: string): { files: FileDiffEntry[]; totalAdditions: number; totalDeletions: number } {
  const files: FileDiffEntry[] = [];
  let totalAdditions = 0;
  let totalDeletions = 0;

  if (!diffText.trim()) return { files, totalAdditions, totalDeletions };

  // Split by "diff --git" headers
  const chunks = diffText.split(/^diff --git /m).filter(Boolean);

  for (const chunk of chunks) {
    const lines = chunk.split('\n');
    const headerLine = lines[0] || '';

    // Extract file path from "a/path b/path"
    const pathMatch = headerLine.match(/a\/(.+?)\s+b\/(.+)/);
    const filePath = pathMatch ? pathMatch[2] : headerLine.trim();

    // Determine status
    let status: FileDiffEntry['status'] = 'modified';
    if (chunk.includes('new file mode')) status = 'added';
    else if (chunk.includes('deleted file mode')) status = 'deleted';
    else if (chunk.includes('rename from')) status = 'renamed';

    // Count additions/deletions
    let additions = 0;
    let deletions = 0;
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) additions++;
      else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
    }

    totalAdditions += additions;
    totalDeletions += deletions;

    files.push({ filePath, status, additions, deletions });
  }

  return { files, totalAdditions, totalDeletions };
}

export function registerDiffViewerHandlers() {
  ipcMain.handle(
    IPC_CHANNELS.GET_GIT_DIFF,
    async (
      _,
      opts: { projectPath: string; fromRef?: string; toRef?: string }
    ): Promise<DiffResult> => {
      const git = simpleGit(opts.projectPath);

      let fullDiff = '';
      if (opts.fromRef && opts.toRef) {
        fullDiff = await git.diff([opts.fromRef, opts.toRef]);
      } else {
        // Combine unstaged + staged diffs
        const unstaged = await git.diff();
        const staged = await git.diff(['--cached']);
        fullDiff = [unstaged, staged].filter(Boolean).join('\n');
      }

      const { files, totalAdditions, totalDeletions } = parseDiffOutput(fullDiff);

      return {
        projectPath: opts.projectPath,
        files,
        totalAdditions,
        totalDeletions,
        fullDiff,
      };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_GIT_STATUS_LIVE,
    async (_, projectPath: string): Promise<DiffResult> => {
      const git = simpleGit(projectPath);
      const status = await git.status();

      const files: FileDiffEntry[] = [];

      for (const file of status.files) {
        let fileStatus: FileDiffEntry['status'] = 'modified';
        const code = file.index || file.working_dir;
        if (code === '?' || code === 'A') fileStatus = 'added';
        else if (code === 'D') fileStatus = 'deleted';
        else if (code === 'R') fileStatus = 'renamed';

        files.push({
          filePath: file.path,
          status: fileStatus,
          additions: 0,
          deletions: 0,
        });
      }

      return {
        projectPath,
        files,
        totalAdditions: 0,
        totalDeletions: 0,
        fullDiff: '',
      };
    }
  );
}
