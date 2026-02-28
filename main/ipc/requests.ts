import { ipcMain, BrowserWindow } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { IPC_CHANNELS, DesignRequest } from '../../shared/types';
import { log } from '../helpers/logger';

const HOME = os.homedir();
const REQUESTS_DIR = path.join(HOME, '.claude', 'studio', 'requests');

// In-memory request store (persisted to disk)
let requests: DesignRequest[] = [];

// Active Claude Code PTY session per request
const activeProcesses = new Map<string, ReturnType<typeof import('node-pty').spawn>>();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty = require('node-pty');

async function ensureDir() {
  await fs.mkdir(REQUESTS_DIR, { recursive: true });
}

async function loadRequests(): Promise<DesignRequest[]> {
  await ensureDir();
  try {
    const data = await fs.readFile(path.join(REQUESTS_DIR, 'requests.json'), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveRequests() {
  await ensureDir();
  await fs.writeFile(
    path.join(REQUESTS_DIR, 'requests.json'),
    JSON.stringify(requests, null, 2),
    'utf-8'
  );
}

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

function pushUpdate(channel: string, data: unknown) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

function translateToolUse(summary: string): string {
  if (summary.startsWith('Edit:') || summary.startsWith('Write:')) {
    const file = summary.split(':').slice(1).join(':').trim();
    const name = file.split('/').pop() || file;
    const ext = name.split('.').pop();
    if (ext === 'tsx' || ext === 'jsx') return `Updating ${name.replace(`.${ext}`, '')} component`;
    if (ext === 'css' || ext === 'scss') return `Updating styles`;
    if (ext === 'ts' || ext === 'js') return `Updating ${name.replace(`.${ext}`, '')}`;
    return `Editing ${name}`;
  }
  if (summary.startsWith('Read:')) {
    const file = summary.split(':').slice(1).join(':').trim().split('/').pop() || '';
    if (file.includes('tailwind')) return 'Checking design tokens';
    if (file.includes('package')) return 'Checking project configuration';
    return `Reading ${file}`;
  }
  if (summary.startsWith('Bash:')) {
    const cmd = summary.slice(5).trim();
    if (cmd.startsWith('npm install') || cmd.startsWith('yarn add')) return 'Installing dependency';
    if (cmd.startsWith('npm run build')) return 'Building project';
    if (cmd.startsWith('npm run')) return 'Running project script';
    return 'Running command';
  }
  if (summary.startsWith('Glob:') || summary.startsWith('Grep:')) return 'Scanning project files';
  return summary;
}

async function captureMainWindowScreenshot(filePath: string): Promise<boolean> {
  const win = getMainWindow();
  if (!win || win.isDestroyed()) return false;
  const image = await win.webContents.capturePage();
  const pngBuffer = image.toPNG();
  await fs.writeFile(filePath, pngBuffer);
  return true;
}

async function executeRequest(request: DesignRequest) {
  request.status = 'in_progress';
  request.startedAt = Date.now();
  pushUpdate(IPC_CHANNELS.REQUEST_STATUS_UPDATE, request);
  await saveRequests();

  // Capture before screenshot
  try {
    const beforePath = path.join(REQUESTS_DIR, `${request.id}-before.png`);
    const captured = await captureMainWindowScreenshot(beforePath);
    if (captured) {
      request.screenshotBefore = beforePath;
      await saveRequests();
    }
  } catch (error) {
    log('warn', 'requests', 'Failed to capture before screenshot', error);
  }

  const shell = process.env.SHELL || '/bin/zsh';

  // Build the Claude command with the request prompt
  const escapedPrompt = request.prompt.replace(/'/g, "'\\''");
  const command = `cd '${request.projectPath}' && claude --print '${escapedPrompt}'`;

  log('info', 'requests', `Executing request ${request.id}: ${request.prompt.slice(0, 80)}`);

  const proc = pty.spawn(shell, ['-c', command], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: request.projectPath,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
    },
  });

  activeProcesses.set(request.id, proc);

  proc.onData((data: string) => {
    const lines = data.split('\n').filter(Boolean);
    for (const line of lines) {
      const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
      if (clean.length > 0 && !clean.startsWith('╭') && !clean.startsWith('│') && !clean.startsWith('╰')) {
        const translated = translateToolUse(clean);
        pushUpdate(IPC_CHANNELS.REQUEST_FEED_UPDATE, {
          timestamp: Date.now(),
          type: 'action',
          message: translated,
          detail: clean,
          requestId: request.id,
        });
      }
    }
  });

  proc.onExit(async ({ exitCode }: { exitCode: number }) => {
    activeProcesses.delete(request.id);
    request.status = 'review';
    request.completedAt = Date.now();
    if (exitCode !== 0) {
      request.error = `Claude exited with code ${exitCode}`;
      log('warn', 'requests', `Request ${request.id} exited with code ${exitCode}`);
    } else {
      log('info', 'requests', `Request ${request.id} completed successfully`);
    }

    // Capture after screenshot
    try {
      const afterPath = path.join(REQUESTS_DIR, `${request.id}-after.png`);
      const captured = await captureMainWindowScreenshot(afterPath);
      if (captured) {
        request.screenshotAfter = afterPath;
      }
    } catch (error) {
      log('warn', 'requests', 'Failed to capture after screenshot', error);
    }

    pushUpdate(IPC_CHANNELS.REQUEST_STATUS_UPDATE, request);
    pushUpdate(IPC_CHANNELS.REQUEST_FEED_UPDATE, {
      timestamp: Date.now(),
      type: exitCode === 0 ? 'complete' : 'error',
      message: exitCode === 0 ? 'Request completed — ready for review' : `Request failed: ${request.error}`,
      requestId: request.id,
    });
    await saveRequests();
  });
}

export function registerRequestHandlers() {
  loadRequests().then((loaded) => {
    requests = loaded;
    log('info', 'requests', `Loaded ${requests.length} persisted requests`);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_REQUEST, async (_, data: {
    projectId: string;
    projectPath: string;
    prompt: string;
    attachments?: DesignRequest['attachments'];
  }) => {
    const request: DesignRequest = {
      id: uuidv4(),
      projectId: data.projectId,
      projectPath: data.projectPath,
      prompt: data.prompt,
      attachments: data.attachments || [],
      status: 'queued',
      createdAt: Date.now(),
    };
    requests.unshift(request);
    await saveRequests();

    log('info', 'requests', `Created request ${request.id} for project ${data.projectId}`);

    // Auto-execute (queue of 1 for MVP)
    executeRequest(request);

    return request;
  });

  ipcMain.handle(IPC_CHANNELS.GET_REQUESTS, async (_, projectId?: string) => {
    if (projectId) {
      return requests.filter((r) => r.projectId === projectId);
    }
    return requests;
  });

  ipcMain.handle(IPC_CHANNELS.CANCEL_REQUEST, async (_, requestId: string) => {
    const proc = activeProcesses.get(requestId);
    if (proc) {
      proc.kill();
      activeProcesses.delete(requestId);
    }
    const request = requests.find((r) => r.id === requestId);
    if (request) {
      request.status = 'rejected';
      request.completedAt = Date.now();
      await saveRequests();
      pushUpdate(IPC_CHANNELS.REQUEST_STATUS_UPDATE, request);
    }
    log('info', 'requests', `Cancelled request ${requestId}`);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.APPROVE_REQUEST, async (_, requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (request) {
      request.status = 'approved';
      await saveRequests();
      pushUpdate(IPC_CHANNELS.REQUEST_STATUS_UPDATE, request);
    }
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.REJECT_REQUEST, async (_, requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (request) {
      request.status = 'rejected';
      await saveRequests();
      pushUpdate(IPC_CHANNELS.REQUEST_STATUS_UPDATE, request);
    }
    return true;
  });
}

export function cleanupRequests() {
  for (const [id, proc] of activeProcesses) {
    proc.kill();
    activeProcesses.delete(id);
  }
}
