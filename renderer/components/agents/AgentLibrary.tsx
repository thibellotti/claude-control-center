import React, { useState, useCallback, useMemo } from 'react';
import type { Agent, AgentRun } from '../../../shared/agent-types';
import { useAgents } from '../../hooks/useAgents';
import { useProjectContext } from '../../hooks/useProjectContext';
import AgentCard from './AgentCard';
import AgentEditor from './AgentEditor';
import AgentRunner from './AgentRunner';
import { PlusIcon, CloseIcon, PlayIcon, AgentsIcon } from '../icons';

// ---------------------------------------------------------------------------
// Run dialog — select project + task, then confirm
// ---------------------------------------------------------------------------

interface RunDialogProps {
  agent: Agent;
  projects: { name: string; path: string; client?: string | null }[];
  onConfirm: (projectPath: string, task: string) => void;
  onClose: () => void;
}

function RunDialog({ agent, projects, onConfirm, onClose }: RunDialogProps) {
  const [selectedPath, setSelectedPath] = useState(projects[0]?.path || '');
  const [task, setTask] = useState(agent.defaultTask || '');

  const handleSubmit = useCallback(() => {
    if (!selectedPath || !task.trim()) return;
    onConfirm(selectedPath, task.trim());
  }, [selectedPath, task, onConfirm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
    },
    [onClose, handleSubmit]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm modal-backdrop"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-dialog-title"
    >
      <div
        className="w-full max-w-md mx-4 bg-surface-1 border border-border-subtle rounded-card shadow-2xl modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="text-base select-none">{agent.icon}</span>
            <h2 id="run-dialog-title" className="text-sm font-semibold text-text-primary">
              Run {agent.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Project selector */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">
              Project
            </label>
            <select
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent transition-colors appearance-none"
            >
              {projects.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.client ? `${p.client} / ${p.name}` : p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Task */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">
              Task
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="What should the agent do?"
              rows={3}
              className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border-subtle text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors resize-y"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-button text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPath || !task.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-button text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <PlayIcon />
            Run
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentLibrary — main page
// ---------------------------------------------------------------------------

export default function AgentLibrary() {
  const { agents, runs, loading, saveAgent, deleteAgent, runAgent, killRun } = useAgents();
  const { projects } = useProjectContext();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [runDialogAgent, setRunDialogAgent] = useState<Agent | null>(null);
  const [activeRun, setActiveRun] = useState<AgentRun | null>(null);

  // Count runs per agent
  const runCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const run of runs) {
      counts.set(run.agentId, (counts.get(run.agentId) || 0) + 1);
    }
    return counts;
  }, [runs]);

  // Keep active run synced from the runs list
  const displayedRun = useMemo(() => {
    if (!activeRun) return null;
    return runs.find((r) => r.id === activeRun.id) || activeRun;
  }, [activeRun, runs]);

  const handleNewAgent = useCallback(() => {
    setEditingAgent(null);
    setEditorOpen(true);
  }, []);

  const handleEditAgent = useCallback((agent: Agent) => {
    setEditingAgent(agent);
    setEditorOpen(true);
  }, []);

  const handleSaveAgent = useCallback(
    (agent: Agent) => { saveAgent(agent); },
    [saveAgent]
  );

  const handleDeleteAgent = useCallback(
    (agentId: string) => { deleteAgent(agentId); },
    [deleteAgent]
  );

  const handleCloseEditor = useCallback(() => {
    setEditorOpen(false);
    setEditingAgent(null);
  }, []);

  const handleRunConfirm = useCallback(
    async (projectPath: string, task: string) => {
      if (!runDialogAgent) return;
      const run = await runAgent(runDialogAgent.id, projectPath, task);
      setRunDialogAgent(null);
      if (run) setActiveRun(run);
    },
    [runDialogAgent, runAgent]
  );

  const projectList = useMemo(
    () => projects.map((p) => ({ name: p.name, path: p.path, client: p.client })),
    [projects]
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-5 w-20 bg-surface-2 rounded animate-pulse" />
            <div className="h-3 w-48 bg-surface-2 rounded animate-pulse mt-2" />
          </div>
          <div className="h-8 w-24 bg-surface-2 rounded-button animate-pulse" />
        </div>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-1 border border-border-subtle rounded-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-surface-2 rounded animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-surface-2 rounded animate-pulse" />
                  <div className="h-3 w-full bg-surface-2 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-3 w-20 bg-surface-2 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Agents</h1>
          <p className="text-xs text-text-tertiary mt-1">
            Create and manage CC agents for automated tasks
          </p>
        </div>
        <button
          onClick={handleNewAgent}
          className="flex items-center gap-2 px-4 py-2 rounded-button text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover transition-colors"
        >
          <PlusIcon />
          New Agent
        </button>
      </div>

      {/* Agent grid */}
      {agents.length > 0 ? (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              runCount={runCounts.get(agent.id) || 0}
              onEdit={() => handleEditAgent(agent)}
              onRun={() => setRunDialogAgent(agent)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-2 text-text-tertiary mb-4">
            <AgentsIcon size={24} />
          </div>
          <p className="text-text-primary text-sm font-medium">Create your first AI agent</p>
          <p className="text-text-tertiary text-xs mt-1 max-w-xs mx-auto">
            Agents run Claude Code with custom system prompts on your projects
          </p>
          <button
            onClick={handleNewAgent}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-button text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover transition-colors"
          >
            <PlusIcon />
            New Agent
          </button>
        </div>
      )}

      {/* Active run / runner panel */}
      {displayedRun && (
        <AgentRunner
          run={displayedRun}
          onKill={killRun}
          onClose={() => setActiveRun(null)}
        />
      )}

      {/* Editor modal */}
      {editorOpen && (
        <AgentEditor
          agent={editingAgent}
          onSave={handleSaveAgent}
          onDelete={handleDeleteAgent}
          onClose={handleCloseEditor}
        />
      )}

      {/* Run dialog */}
      {runDialogAgent && (
        <RunDialog
          agent={runDialogAgent}
          projects={projectList}
          onConfirm={handleRunConfirm}
          onClose={() => setRunDialogAgent(null)}
        />
      )}
    </div>
  );
}
