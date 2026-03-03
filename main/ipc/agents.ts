import { ipcMain, BrowserWindow } from 'electron';
import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { IPC_CHANNELS } from '../../shared/types';
import type { Agent, AgentRun } from '../../shared/agent-types';
import { DEFAULT_AGENTS } from '../../shared/agent-types';
import { log } from '../helpers/logger';
import { logSecurityEvent } from '../helpers/security-logger';
import { cleanEnv } from './terminal';
import { isPathSafe } from '../helpers/path-safety';
import { saveSessionOutput } from './session-history';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty = require('node-pty');

const FORMA_DIR = join(homedir(), '.forma');
const AGENTS_FILE = join(FORMA_DIR, 'agents.json');
const RUNS_FILE = join(FORMA_DIR, 'agent-runs.json');

// In-memory stores
let agents: Agent[] = [];
let runs: AgentRun[] = [];

// Active agent PTY processes keyed by run id
const activeProcesses = new Map<string, ReturnType<typeof import('node-pty').spawn>>();

// Timeout timers keyed by run id
const timeoutTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Output buffers for session history
const agentOutputBuffers = new Map<string, string[]>();

async function ensureDir() {
  await fs.mkdir(FORMA_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Agents persistence
// ---------------------------------------------------------------------------

async function loadAgents(): Promise<Agent[]> {
  await ensureDir();
  try {
    const data = await fs.readFile(AGENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveAgents(): Promise<void> {
  await ensureDir();
  await fs.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf-8');
}

async function seedDefaultAgents(): Promise<Agent[]> {
  const now = Date.now();
  const seeded: Agent[] = DEFAULT_AGENTS.map((a) => ({
    ...a,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  }));
  agents = seeded;
  await saveAgents();
  return seeded;
}

// ---------------------------------------------------------------------------
// Agent runs persistence
// ---------------------------------------------------------------------------

async function loadRuns(): Promise<AgentRun[]> {
  await ensureDir();
  try {
    const data = await fs.readFile(RUNS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveRuns(): Promise<void> {
  await ensureDir();
  await fs.writeFile(RUNS_FILE, JSON.stringify(runs, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

// Promise that resolves once persisted data has been loaded into memory.
let dataReady: Promise<void>;

export function registerAgentHandlers() {
  dataReady = Promise.all([loadAgents(), loadRuns()]).then(([loadedAgents, loadedRuns]) => {
    agents = loadedAgents;
    runs = loadedRuns;
    log('info', 'agents', `Loaded ${agents.length} agents, ${runs.length} runs`);
  });

  // ------- CRUD -------

  ipcMain.handle(IPC_CHANNELS.GET_AGENTS, async () => {
    await dataReady;
    if (agents.length === 0) {
      return seedDefaultAgents();
    }
    return agents;
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_AGENT, async (_, agent: Agent) => {
    await dataReady;
    const idx = agents.findIndex((a) => a.id === agent.id);
    if (idx >= 0) {
      agents[idx] = { ...agent, updatedAt: Date.now() };
    } else {
      agents.push({
        ...agent,
        id: agent.id || uuidv4(),
        createdAt: agent.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
    }
    await saveAgents();
    return agents;
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_AGENT, async (_, agentId: string) => {
    await dataReady;
    agents = agents.filter((a) => a.id !== agentId);
    await saveAgents();
    return agents;
  });

  // ------- Execution -------

  ipcMain.handle(
    IPC_CHANNELS.RUN_AGENT,
    async (_, opts: { agentId: string; projectPath: string; task: string }) => {
      await dataReady;

      const agent = agents.find((a) => a.id === opts.agentId);
      if (!agent) throw new Error(`Agent not found: ${opts.agentId}`);

      if (!isPathSafe(opts.projectPath)) {
        logSecurityEvent('path-traversal', 'high', 'Agent run blocked for unsafe project path', {
          projectPath: opts.projectPath,
          agentId: opts.agentId,
        });
        throw new Error('Access denied: project path is outside the home directory');
      }

      const runId = uuidv4();
      const task = opts.task || agent.defaultTask || 'Help me with this project';

      const run: AgentRun = {
        id: runId,
        agentId: agent.id,
        agentName: agent.name,
        agentIcon: agent.icon,
        task,
        projectPath: opts.projectPath,
        status: 'running',
        output: '',
        startedAt: Date.now(),
      };

      runs.unshift(run);
      // Cap history to 200 entries
      if (runs.length > 200) runs.length = 200;
      await saveRuns();

      log('info', 'agents', `Starting agent run ${runId} (${agent.name}) in ${opts.projectPath}`);

      const proc = pty.spawn(
        'claude',
        ['--print', '--system-prompt', agent.systemPrompt, '-p', task],
        {
          name: 'xterm-256color',
          cols: 120,
          rows: 30,
          cwd: opts.projectPath,
          env: { ...cleanEnv(), TERM: 'xterm-256color' },
        }
      );

      run.pid = proc.pid;
      activeProcesses.set(runId, proc);
      agentOutputBuffers.set(runId, []);

      // Stream output (cap stored output at 5MB to prevent memory bloat)
      const MAX_OUTPUT_BYTES = 5 * 1024 * 1024; // 5MB
      proc.onData((data: string) => {
        if (run.output.length < MAX_OUTPUT_BYTES) {
          run.output += data;
        }
        // Always send to renderer for live streaming regardless of cap
        pushUpdate(IPC_CHANNELS.AGENT_OUTPUT, { runId, data });
        // Buffer for session history
        const buf = agentOutputBuffers.get(runId);
        if (buf) buf.push(data);
      });

      // On exit
      proc.onExit(async ({ exitCode }: { exitCode: number }) => {
        activeProcesses.delete(runId);

        // Clear timeout timer
        const timer = timeoutTimers.get(runId);
        if (timer) {
          clearTimeout(timer);
          timeoutTimers.delete(runId);
        }

        // Only update status if not already killed (timeout sets status before kill)
        if (run.status === 'running') {
          run.status = exitCode === 0 ? 'completed' : 'failed';
        }
        run.completedAt = Date.now();

        log(
          'info',
          'agents',
          `Agent run ${runId} finished with status ${run.status} (exit ${exitCode})`
        );

        // Save accumulated output to session history
        const buf = agentOutputBuffers.get(runId);
        if (buf && buf.length > 0) {
          saveSessionOutput({
            sessionId: `agent-${runId}`,
            projectPath: opts.projectPath,
            projectName: basename(opts.projectPath),
            command: `agent: ${agent.name} — ${task}`,
            output: buf.join(''),
          });
        }
        agentOutputBuffers.delete(runId);

        pushUpdate(IPC_CHANNELS.AGENT_EXIT, { runId, status: run.status });
        await saveRuns();
      });

      // Timeout
      const timer = setTimeout(() => {
        timeoutTimers.delete(runId);
        const p = activeProcesses.get(runId);
        if (p) {
          log('warn', 'agents', `Agent run ${runId} timed out after ${agent.timeoutSeconds}s`);
          run.status = 'killed';
          p.kill();
        }
      }, agent.timeoutSeconds * 1000);
      timeoutTimers.set(runId, timer);

      return run;
    }
  );

  ipcMain.handle(IPC_CHANNELS.KILL_AGENT_RUN, async (_, runId: string) => {
    await dataReady;
    const proc = activeProcesses.get(runId);
    if (proc) {
      const run = runs.find((r) => r.id === runId);
      if (run) run.status = 'killed';
      proc.kill();
      activeProcesses.delete(runId);

      const timer = timeoutTimers.get(runId);
      if (timer) {
        clearTimeout(timer);
        timeoutTimers.delete(runId);
      }

      log('info', 'agents', `Killed agent run ${runId}`);
    }
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.GET_AGENT_RUNS, async (_, projectPath?: string) => {
    await dataReady;
    if (projectPath) {
      return runs.filter((r) => r.projectPath === projectPath);
    }
    return runs;
  });
}

// ---------------------------------------------------------------------------
// Cleanup — called on app quit
// ---------------------------------------------------------------------------

export function cleanupAgents() {
  for (const [id, proc] of activeProcesses) {
    proc.kill();
    activeProcesses.delete(id);
  }
  for (const [id, timer] of timeoutTimers) {
    clearTimeout(timer);
    timeoutTimers.delete(id);
  }
  agentOutputBuffers.clear();
}
