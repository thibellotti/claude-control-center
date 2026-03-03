import React, { memo } from 'react';
import type { Agent } from '../../../shared/agent-types';
import { PencilIcon, PlayIcon } from '../icons';

interface AgentCardProps {
  agent: Agent;
  runCount: number;
  onEdit: () => void;
  onRun: () => void;
}

export default memo(function AgentCard({ agent, runCount, onEdit, onRun }: AgentCardProps) {
  // Take the first line of the system prompt as a short description
  const rawDesc = agent.systemPrompt.trim();
  const description = rawDesc ? rawDesc.split('\n')[0].slice(0, 120) : 'No description';

  return (
    <div className="group relative bg-surface-1 border border-border-subtle rounded-card p-4 hover:border-accent/60 transition-all duration-150">
      {/* Header row */}
      <div className="flex items-start gap-3 mb-2">
        <span className="text-lg shrink-0 select-none" role="img" aria-label={agent.name}>
          {agent.icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-text-primary truncate">
            {agent.name}
          </h3>
          <p className="text-xs text-text-tertiary line-clamp-2 leading-relaxed mt-0.5">
            {description}
          </p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 mb-3">
        {runCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-surface-3 text-micro font-medium text-text-secondary">
            {runCount} run{runCount !== 1 ? 's' : ''}
          </span>
        )}
        <span className="text-micro text-text-tertiary">
          {Math.floor(agent.timeoutSeconds / 60)} min timeout
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="flex items-center gap-1 px-2 py-1 rounded-button text-xs text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors"
          title="Edit agent"
        >
          <PencilIcon />
          <span>Edit</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRun(); }}
          className="flex items-center gap-1 px-2 py-1 rounded-button text-xs text-accent hover:bg-accent/10 transition-colors"
          title="Run agent"
        >
          <PlayIcon />
          <span>Run</span>
        </button>
      </div>
    </div>
  );
});
