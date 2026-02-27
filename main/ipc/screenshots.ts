import { ipcMain, BrowserWindow } from 'electron';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  unlinkSync,
} from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { IPC_CHANNELS } from '../../shared/types';
import type { ScreenshotEntry } from '../../shared/types';

const SCREENSHOTS_DIR = path.join(
  os.homedir(),
  '.claude',
  'studio',
  'screenshots'
);

/**
 * Ensure the screenshots directory exists for a given project.
 */
function ensureDir(projectId: string): string {
  const dir = path.join(SCREENSHOTS_DIR, projectId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function registerScreenshotHandlers() {
  // Capture a screenshot of a URL using a hidden BrowserWindow
  ipcMain.handle(
    IPC_CHANNELS.CAPTURE_SCREENSHOT,
    async (
      _,
      opts: {
        url: string;
        label: string;
        projectId: string;
        viewport: { width: number; height: number };
        commitHash?: string;
        commitMessage?: string;
      }
    ): Promise<ScreenshotEntry> => {
      const { url, label, projectId, viewport, commitHash, commitMessage } =
        opts;

      // Clamp viewport width for reasonable file sizes
      const width = Math.min(viewport.width, 1440);
      const height = viewport.height;

      const dir = ensureDir(projectId);
      const id = randomUUID();

      // Create a hidden BrowserWindow
      const win = new BrowserWindow({
        width,
        height,
        show: false,
        webPreferences: {
          offscreen: true,
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      try {
        // Navigate and wait for load
        await win.loadURL(url);

        // Wait an additional 2 seconds for JS rendering / animations
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Capture the page
        const image = await win.webContents.capturePage();
        const pngBuffer = image.toPNG();

        // Save PNG
        const imagePath = path.join(dir, `${id}.png`);
        writeFileSync(imagePath, pngBuffer);

        // Build entry
        const entry: ScreenshotEntry = {
          id,
          label,
          timestamp: Date.now(),
          imagePath,
          url,
          viewport: { width, height },
          commitHash,
          commitMessage,
        };

        // Save metadata JSON
        writeFileSync(
          path.join(dir, `${id}.json`),
          JSON.stringify(entry, null, 2)
        );

        return entry;
      } catch (err) {
        throw new Error(
          `Screenshot capture failed: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        win.destroy();
      }
    }
  );

  // Get all screenshots for a project
  ipcMain.handle(
    IPC_CHANNELS.GET_SCREENSHOTS,
    async (_, projectId: string): Promise<ScreenshotEntry[]> => {
      const dir = path.join(SCREENSHOTS_DIR, projectId);
      if (!existsSync(dir)) return [];

      try {
        const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
        const entries: ScreenshotEntry[] = [];

        for (const file of files) {
          try {
            const raw = readFileSync(path.join(dir, file), 'utf-8');
            const entry = JSON.parse(raw) as ScreenshotEntry;
            // Only include entries whose PNG still exists
            if (existsSync(entry.imagePath)) {
              entries.push(entry);
            }
          } catch {
            // Skip corrupt metadata files
            continue;
          }
        }

        // Sort by timestamp descending (newest first)
        entries.sort((a, b) => b.timestamp - a.timestamp);
        return entries;
      } catch {
        return [];
      }
    }
  );

  // Delete a screenshot
  ipcMain.handle(
    IPC_CHANNELS.DELETE_SCREENSHOT,
    async (
      _,
      opts: { projectId: string; screenshotId: string }
    ): Promise<boolean> => {
      const dir = path.join(SCREENSHOTS_DIR, opts.projectId);
      const pngPath = path.join(dir, `${opts.screenshotId}.png`);
      const jsonPath = path.join(dir, `${opts.screenshotId}.json`);

      try {
        if (existsSync(pngPath)) unlinkSync(pngPath);
        if (existsSync(jsonPath)) unlinkSync(jsonPath);
        return true;
      } catch {
        return false;
      }
    }
  );

  // Get a screenshot image as base64 data URL
  ipcMain.handle(
    IPC_CHANNELS.GET_SCREENSHOT_IMAGE,
    async (_, imagePath: string): Promise<string | null> => {
      try {
        if (!existsSync(imagePath)) return null;
        const buffer = readFileSync(imagePath);
        return `data:image/png;base64,${buffer.toString('base64')}`;
      } catch {
        return null;
      }
    }
  );
}
