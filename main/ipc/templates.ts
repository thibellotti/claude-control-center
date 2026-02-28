import { ipcMain, dialog } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { log } from '../helpers/logger';

interface Template {
  id: string;
  name: string;
  description: string;
  scaffoldPrompt: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'landing-page',
    name: 'Landing Page',
    description: 'Single page with hero, features, pricing, and footer sections',
    scaffoldPrompt: `Create a modern landing page using Next.js 14 with App Router and Tailwind CSS. Include:
- A hero section with heading, subtitle, and CTA button
- A features section with 3 feature cards in a grid
- A pricing section with 3 pricing tiers
- A footer with links and copyright
Use a clean, minimal design. Make it responsive. Use a professional color palette.`,
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Auth page + sidebar layout + dashboard pages',
    scaffoldPrompt: `Create a dashboard application using Next.js 14 with App Router and Tailwind CSS. Include:
- A login page with email/password form (mock auth, no real backend)
- A sidebar layout with navigation links
- A main dashboard page with summary cards and a chart placeholder
- A settings page with a form
- A data table page with mock data
Use a clean professional design with a dark sidebar.`,
  },
  {
    id: 'blank',
    name: 'Blank',
    description: 'Minimal Next.js + Tailwind CSS setup',
    scaffoldPrompt: `Create a minimal Next.js 14 project with App Router and Tailwind CSS. Include:
- A clean home page with a centered heading "Welcome to your new project"
- Tailwind CSS configured with a custom color palette
- A layout.tsx with metadata
Keep it minimal — just the foundation for building on.`,
  },
];

export function registerTemplateHandlers() {
  ipcMain.handle('get-templates', async () => {
    return TEMPLATES.map(({ id, name, description }) => ({ id, name, description }));
  });

  ipcMain.handle('create-from-template', async (_, opts: { templateId: string; projectName: string; parentDir?: string }) => {
    const template = TEMPLATES.find((t) => t.id === opts.templateId);
    if (!template) throw new Error(`Template not found: ${opts.templateId}`);

    const parentDir = opts.parentDir || path.join(os.homedir(), 'Projects');
    await fs.mkdir(parentDir, { recursive: true });

    const projectDir = path.join(parentDir, opts.projectName);

    // Check if directory already exists
    try {
      await fs.access(projectDir);
      throw new Error(`Directory already exists: ${projectDir}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    await fs.mkdir(projectDir, { recursive: true });

    log('info', 'templates', `Creating project from template "${template.name}" at ${projectDir}`);

    return {
      projectPath: projectDir,
      scaffoldPrompt: template.scaffoldPrompt,
    };
  });

  ipcMain.handle('pick-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose project location',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}
