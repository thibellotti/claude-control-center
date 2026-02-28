import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import { log } from '../helpers/logger';

interface DetectedPage {
  path: string;     // route path like "/" or "/about"
  label: string;    // display name like "Home" or "About"
  filePath: string; // absolute file path
}

async function detectNextJSPages(projectPath: string): Promise<DetectedPage[]> {
  const pages: DetectedPage[] = [];

  // Check for App Router (app/ directory)
  const appDir = path.join(projectPath, 'app');
  const pagesDir = path.join(projectPath, 'pages');
  const srcAppDir = path.join(projectPath, 'src', 'app');
  const srcPagesDir = path.join(projectPath, 'src', 'pages');

  // Try each directory
  for (const dir of [appDir, srcAppDir]) {
    try {
      await fs.access(dir);
      await scanAppRouter(dir, dir, pages);
      return pages;
    } catch { /* directory doesn't exist */ }
  }

  for (const dir of [pagesDir, srcPagesDir]) {
    try {
      await fs.access(dir);
      await scanPagesRouter(dir, dir, pages);
      return pages;
    } catch { /* directory doesn't exist */ }
  }

  return pages;
}

async function scanAppRouter(baseDir: string, currentDir: string, pages: DetectedPage[]) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Skip special directories
      if (entry.name.startsWith('_') || entry.name.startsWith('.') || entry.name === 'api' || entry.name === 'node_modules') continue;
      await scanAppRouter(baseDir, path.join(currentDir, entry.name), pages);
    } else if (entry.name === 'page.tsx' || entry.name === 'page.jsx' || entry.name === 'page.js') {
      const relativePath = path.relative(baseDir, currentDir);
      const routePath = '/' + relativePath.replace(/\\/g, '/');
      const label = relativePath === '' ? 'Home' : relativePath.split('/').pop() || relativePath;
      pages.push({
        path: routePath === '/.' ? '/' : routePath,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        filePath: path.join(currentDir, entry.name),
      });
    }
  }
}

async function scanPagesRouter(baseDir: string, currentDir: string, pages: DetectedPage[]) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith('_') || entry.name.startsWith('.') || entry.name === 'api' || entry.name === 'node_modules') continue;
      await scanPagesRouter(baseDir, fullPath, pages);
    } else if (/\.(tsx|jsx|js)$/.test(entry.name) && !entry.name.startsWith('_')) {
      const relativePath = path.relative(baseDir, fullPath);
      const routePath = '/' + relativePath.replace(/\\/g, '/').replace(/\.(tsx|jsx|js)$/, '').replace(/\/index$/, '');
      const name = entry.name.replace(/\.(tsx|jsx|js)$/, '');
      const label = name === 'index' ? 'Home' : name.charAt(0).toUpperCase() + name.slice(1);

      pages.push({
        path: routePath || '/',
        label,
        filePath: fullPath,
      });
    }
  }
}

export function registerPageHandlers() {
  ipcMain.handle('get-project-pages', async (_, projectPath: string) => {
    try {
      const pages = await detectNextJSPages(projectPath);
      log('info', 'pages', `Detected ${pages.length} pages in ${projectPath}`);
      return pages;
    } catch (error) {
      log('warn', 'pages', 'Failed to detect pages', error);
      return [];
    }
  });
}
