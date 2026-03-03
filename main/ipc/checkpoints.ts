import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import simpleGit from 'simple-git';
import { IPC_CHANNELS, SessionCheckpoint } from '../../shared/types';

const CHECKPOINTS_DIR = path.join(os.homedir(), '.forma', 'checkpoints');

async function ensureDir() {
  await fs.mkdir(CHECKPOINTS_DIR, { recursive: true });
}

function hashProjectPath(projectPath: string): string {
  return createHash('sha256').update(projectPath).digest('hex').slice(0, 16);
}

function getMetadataPath(projectPath: string): string {
  return path.join(CHECKPOINTS_DIR, `${hashProjectPath(projectPath)}.json`);
}

async function readMetadata(projectPath: string): Promise<SessionCheckpoint[]> {
  await ensureDir();
  const filePath = getMetadataPath(projectPath);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as SessionCheckpoint[];
  } catch {
    return [];
  }
}

async function writeMetadata(projectPath: string, checkpoints: SessionCheckpoint[]) {
  await ensureDir();
  const filePath = getMetadataPath(projectPath);
  await fs.writeFile(filePath, JSON.stringify(checkpoints, null, 2), 'utf-8');
}

export function registerCheckpointHandlers() {
  ipcMain.handle(
    IPC_CHANNELS.CREATE_CHECKPOINT,
    async (
      _,
      opts: { projectPath: string; name: string; description?: string }
    ): Promise<SessionCheckpoint> => {
      const git = simpleGit(opts.projectPath);

      const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
      const commitHash = await git.revparse(['HEAD']);

      // git stash create returns a SHA if there are changes, empty string if clean
      let stashRef = '';
      try {
        stashRef = (await git.raw(['stash', 'create'])).trim();
      } catch {
        // No changes to stash — clean state
      }

      // If there are changes, store the stash so it doesn't get garbage collected
      if (stashRef) {
        await git.raw(['stash', 'store', '-m', `forma-checkpoint: ${opts.name}`, stashRef]);
      }

      const checkpoint: SessionCheckpoint = {
        id: uuidv4(),
        name: opts.name,
        projectPath: opts.projectPath,
        branch: branch.trim(),
        stashRef,
        commitHash: commitHash.trim(),
        createdAt: Date.now(),
        description: opts.description,
      };

      const checkpoints = await readMetadata(opts.projectPath);
      checkpoints.push(checkpoint);
      await writeMetadata(opts.projectPath, checkpoints);

      return checkpoint;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_CHECKPOINTS,
    async (_, opts: { projectPath: string }): Promise<SessionCheckpoint[]> => {
      const checkpoints = await readMetadata(opts.projectPath);
      return checkpoints.sort((a, b) => b.createdAt - a.createdAt);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.RESTORE_CHECKPOINT,
    async (_, opts: { projectPath: string; checkpointId: string }): Promise<boolean> => {
      const checkpoints = await readMetadata(opts.projectPath);
      const checkpoint = checkpoints.find((c) => c.id === opts.checkpointId);
      if (!checkpoint) return false;

      const git = simpleGit(opts.projectPath);

      if (checkpoint.stashRef) {
        // Has uncommitted changes saved — apply them
        await git.raw(['stash', 'apply', checkpoint.stashRef]);
      } else {
        // Clean state checkpoint — checkout the commit
        await git.checkout(checkpoint.commitHash);
      }

      return true;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DELETE_CHECKPOINT,
    async (_, opts: { projectPath: string; checkpointId: string }): Promise<boolean> => {
      const checkpoints = await readMetadata(opts.projectPath);
      const checkpoint = checkpoints.find((c) => c.id === opts.checkpointId);
      if (!checkpoint) return false;

      // Try to drop the stash ref if it's still valid
      if (checkpoint.stashRef) {
        const git = simpleGit(opts.projectPath);
        try {
          // Find the stash index matching our ref
          const stashList = await git.raw(['stash', 'list', '--format=%H']);
          const refs = stashList.trim().split('\n');
          const idx = refs.indexOf(checkpoint.stashRef);
          if (idx >= 0) {
            await git.raw(['stash', 'drop', `stash@{${idx}}`]);
          }
        } catch {
          // Stash may already be gone — ignore
        }
      }

      const filtered = checkpoints.filter((c) => c.id !== opts.checkpointId);
      await writeMetadata(opts.projectPath, filtered);
      return true;
    }
  );
}
