import { ipcMain } from 'electron';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import path from 'path';
import os from 'os';
import { IPC_CHANNELS, FigmaLink } from '../../shared/types';

const FIGMA_DIR = path.join(os.homedir(), '.claude', 'studio', 'figma');

function ensureDir() {
  if (!existsSync(FIGMA_DIR)) {
    mkdirSync(FIGMA_DIR, { recursive: true });
  }
}

function generateId(): string {
  return `figma_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getLinksFilePath(projectId: string): string {
  return path.join(FIGMA_DIR, `${projectId}.json`);
}

function readLinks(projectId: string): FigmaLink[] {
  ensureDir();
  const filePath = getLinksFilePath(projectId);
  if (!existsSync(filePath)) {
    return [];
  }
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as FigmaLink[];
  } catch {
    return [];
  }
}

function writeLinks(projectId: string, links: FigmaLink[]) {
  ensureDir();
  const filePath = getLinksFilePath(projectId);
  writeFileSync(filePath, JSON.stringify(links, null, 2), 'utf-8');
}

/**
 * Parse a Figma design URL to extract fileKey and nodeId.
 *
 * Supported formats:
 *   https://figma.com/design/:fileKey/:fileName?node-id=:nodeId
 *   https://www.figma.com/design/:fileKey/:fileName?node-id=1-2
 *   https://www.figma.com/file/:fileKey/:fileName?node-id=1-2
 *   https://figma.com/design/:fileKey/:fileName (without node-id)
 *
 * The node-id in the URL uses dashes (e.g. "1-2") which maps to "1:2".
 */
export function parseFigmaUrl(
  url: string
): { fileKey: string; nodeId: string } | null {
  try {
    const parsed = new URL(url);

    // Must be figma.com
    if (
      !parsed.hostname.endsWith('figma.com') &&
      parsed.hostname !== 'figma.com'
    ) {
      return null;
    }

    // Path should be /design/:fileKey/... or /file/:fileKey/...
    const segments = parsed.pathname.split('/').filter(Boolean);

    if (segments.length < 2) {
      return null;
    }

    const pathType = segments[0];
    if (pathType !== 'design' && pathType !== 'file') {
      return null;
    }

    const fileKey = segments[1];
    if (!fileKey) {
      return null;
    }

    // Node ID from query params (optional)
    const rawNodeId = parsed.searchParams.get('node-id');
    // Convert "1-2" format to "1:2" format
    const nodeId = rawNodeId ? rawNodeId.replace(/-/g, ':') : '';

    return { fileKey, nodeId };
  } catch {
    return null;
  }
}

export function registerFigmaHandlers() {
  ipcMain.handle(
    IPC_CHANNELS.GET_FIGMA_LINKS,
    async (_, projectId: string): Promise<FigmaLink[]> => {
      return readLinks(projectId);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SAVE_FIGMA_LINK,
    async (
      _,
      projectId: string,
      link: Omit<FigmaLink, 'id' | 'createdAt'>
    ): Promise<FigmaLink> => {
      const links = readLinks(projectId);

      const newLink: FigmaLink = {
        ...link,
        id: generateId(),
        createdAt: Date.now(),
      };

      links.push(newLink);
      writeLinks(projectId, links);
      return newLink;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DELETE_FIGMA_LINK,
    async (_, projectId: string, linkId: string): Promise<boolean> => {
      const links = readLinks(projectId);
      const filtered = links.filter((l) => l.id !== linkId);

      if (filtered.length === links.length) {
        return false; // Nothing was removed
      }

      writeLinks(projectId, filtered);
      return true;
    }
  );
}
