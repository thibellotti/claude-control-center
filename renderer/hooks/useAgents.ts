import { useState, useEffect, useCallback, useRef } from 'react';
import type { Agent, AgentRun } from '../../shared/agent-types';

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOutputRef = useRef<Map<string, string>>(new Map());

  const refresh = useCallback(async () => {
    try {
      const [agentData, runData] = await Promise.all([
        window.api.getAgents(),
        window.api.getAgentRuns(),
      ]);
      setAgents(agentData);
      setRuns(runData);
      setError(null);
    } catch (err) {
      console.error('Failed to load agents:', err);
      setError('Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Listen for live agent output
  useEffect(() => {
    const cleanupOutput = window.api.onAgentOutput(({ runId, data }) => {
      const current = activeOutputRef.current.get(runId) || '';
      activeOutputRef.current.set(runId, current + data);
      // Force re-render for active runs
      setRuns(prev => prev.map(r =>
        r.id === runId ? { ...r, output: activeOutputRef.current.get(runId) || '' } : r
      ));
    });

    const cleanupExit = window.api.onAgentExit(({ runId, status }) => {
      setRuns(prev => prev.map(r =>
        r.id === runId ? { ...r, status: status as AgentRun['status'], completedAt: Date.now() } : r
      ));
    });

    return () => { cleanupOutput(); cleanupExit(); };
  }, []);

  const saveAgent = useCallback(async (agent: Agent) => {
    try {
      const updated = await window.api.saveAgent(agent);
      setAgents(updated);
      setError(null);
      return updated;
    } catch (err) {
      console.error('Failed to save agent:', err);
      setError('Failed to save agent');
      return null;
    }
  }, []);

  const deleteAgent = useCallback(async (agentId: string) => {
    try {
      const updated = await window.api.deleteAgent(agentId);
      setAgents(updated);
      setError(null);
      return updated;
    } catch (err) {
      console.error('Failed to delete agent:', err);
      setError('Failed to delete agent');
      return null;
    }
  }, []);

  const runAgent = useCallback(async (agentId: string, projectPath: string, task: string) => {
    try {
      const run = await window.api.runAgent({ agentId, projectPath, task });
      activeOutputRef.current.set(run.id, '');
      setRuns(prev => [...prev, run]);
      setError(null);
      return run;
    } catch (err) {
      console.error('Failed to run agent:', err);
      setError('Failed to run agent');
      return null;
    }
  }, []);

  const killRun = useCallback(async (runId: string) => {
    try {
      await window.api.killAgentRun(runId);
      setRuns(prev => prev.map(r =>
        r.id === runId ? { ...r, status: 'killed' as const, completedAt: Date.now() } : r
      ));
      setError(null);
    } catch (err) {
      console.error('Failed to kill agent run:', err);
      setError('Failed to kill agent run');
    }
  }, []);

  return { agents, runs, loading, error, saveAgent, deleteAgent, runAgent, killRun, refresh };
}
