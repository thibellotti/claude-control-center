import { ipcMain } from 'electron';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from 'fs';
import path from 'path';
import os from 'os';
import { IPC_CHANNELS, Prompt } from '../../shared/types';

const PROMPTS_DIR = path.join(os.homedir(), '.claude', 'studio', 'prompts');

function ensureDir() {
  if (!existsSync(PROMPTS_DIR)) {
    mkdirSync(PROMPTS_DIR, { recursive: true });
  }
}

function generateId(): string {
  return `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const STARTER_PROMPTS: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Component Creation',
    content:
      'Create a new React component with the following requirements. Use TypeScript with proper interface definitions for all props. Include sensible defaults, accessibility attributes (aria-labels, roles), and follow the existing project conventions for styling and file structure. Export the component as a named export.',
    category: 'Development',
    tags: ['react', 'component', 'typescript'],
    isFavorite: false,
  },
  {
    title: 'Bug Fix Analysis',
    content:
      'Analyze the following bug systematically. First, reproduce the issue and identify the exact conditions that trigger it. Then trace the data flow to locate the root cause rather than just the symptom. Propose a minimal fix that does not introduce regressions, and suggest a test case that would prevent this bug from recurring.',
    category: 'Debugging',
    tags: ['bug', 'analysis', 'testing'],
    isFavorite: false,
  },
  {
    title: 'Code Review',
    content:
      'Review the following code for correctness, performance, and maintainability. Check for potential edge cases, error handling gaps, and security concerns. Evaluate naming conventions, code duplication, and adherence to SOLID principles. Provide specific, actionable suggestions with code examples where applicable.',
    category: 'Quality',
    tags: ['review', 'quality', 'best-practices'],
    isFavorite: false,
  },
  {
    title: 'Refactor Request',
    content:
      'Refactor the following code to improve readability and maintainability without changing its external behavior. Identify code smells such as long functions, deep nesting, or duplicated logic. Apply appropriate design patterns and ensure the refactored version is well-tested. Explain each change and the reasoning behind it.',
    category: 'Development',
    tags: ['refactor', 'clean-code', 'patterns'],
    isFavorite: false,
  },
  {
    title: 'Project Setup',
    content:
      'Initialize a new project with the specified stack. Set up the directory structure following best practices, configure linting and formatting tools, add a base TypeScript configuration, and create starter files with placeholder content. Include a .gitignore, environment variable template, and basic CI configuration.',
    category: 'Setup',
    tags: ['setup', 'project', 'configuration'],
    isFavorite: false,
  },
];

function seedStarterPrompts(): Prompt[] {
  const now = Date.now();
  const prompts: Prompt[] = STARTER_PROMPTS.map((starter, i) => {
    const prompt: Prompt = {
      ...starter,
      id: generateId(),
      createdAt: now - (STARTER_PROMPTS.length - i) * 1000,
      updatedAt: now - (STARTER_PROMPTS.length - i) * 1000,
    };
    const filePath = path.join(PROMPTS_DIR, `${prompt.id}.json`);
    writeFileSync(filePath, JSON.stringify(prompt, null, 2), 'utf-8');
    return prompt;
  });
  return prompts;
}

function readAllPrompts(): Prompt[] {
  ensureDir();

  const files = readdirSync(PROMPTS_DIR).filter((f) => f.endsWith('.json'));

  // Seed starter prompts if directory is empty
  if (files.length === 0) {
    return seedStarterPrompts();
  }

  const prompts: Prompt[] = [];
  for (const file of files) {
    try {
      const raw = readFileSync(path.join(PROMPTS_DIR, file), 'utf-8');
      prompts.push(JSON.parse(raw));
    } catch {
      // Skip corrupted files
    }
  }

  return prompts.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function registerPromptHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_PROMPTS, async () => {
    return readAllPrompts();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_PROMPT, async (_, prompt: Prompt) => {
    ensureDir();

    const now = Date.now();
    const toSave: Prompt = {
      ...prompt,
      id: prompt.id || generateId(),
      createdAt: prompt.createdAt || now,
      updatedAt: now,
    };

    const filePath = path.join(PROMPTS_DIR, `${toSave.id}.json`);
    writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf-8');
    return toSave;
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_PROMPT, async (_, id: string) => {
    const filePath = path.join(PROMPTS_DIR, `${id}.json`);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return true;
    }
    return false;
  });
}
