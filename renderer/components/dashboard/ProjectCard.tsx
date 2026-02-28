import React, { memo } from 'react';
import type { Project } from '../../../shared/types';
import StatusBadge from '../shared/StatusBadge';
import GitBadge from '../shared/GitBadge';
import HealthBadge from '../shared/HealthBadge';
import { PencilIcon, ClaudeIcon } from '../icons';

interface ProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
  onOpenEditor: (path: string) => void;
  isLive?: boolean;
}

// Stack detection mapping
const STACK_DETECTORS: { key: string; label: string }[] = [
  { key: 'next', label: 'Next.js' },
  { key: 'react', label: 'React' },
  { key: 'three', label: 'Three.js' },
  { key: '@supabase', label: 'Supabase' },
  { key: 'tailwindcss', label: 'Tailwind' },
  { key: 'framer-motion', label: 'Framer' },
  { key: 'convex', label: 'Convex' },
  { key: 'electron', label: 'Electron' },
];

function detectStack(project: Project): string[] {
  if (!project.packageJson) return [];
  const allDeps = {
    ...project.packageJson.dependencies,
    ...project.packageJson.devDependencies,
  };
  const depKeys = Object.keys(allDeps);
  const tags: string[] = [];
  for (const detector of STACK_DETECTORS) {
    if (tags.length >= 4) break;
    if (depKeys.some((k) => k.includes(detector.key))) {
      tags.push(detector.label);
    }
  }
  return tags;
}

function shortenPath(path: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || '~';
  if (path.startsWith(home)) {
    return '~' + path.slice(home.length);
  }
  return path;
}


export default memo(function ProjectCard({
  project,
  onClick,
  onOpenEditor,
  isLive,
}: ProjectCardProps) {
  const stack = detectStack(project);
  const activeTasks = project.tasks.filter((t) => t.status === 'in_progress' || t.status === 'pending').length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(project)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(project);
        }
      }}
      aria-label={project.name}
      className="group relative min-w-0 bg-surface-1 border border-border-subtle rounded-card p-4 cursor-pointer hover:border-border-default transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate flex items-center gap-1">
            {project.name}
            {isLive && (
              <span className="relative flex h-2 w-2 ml-1 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-status-active" />
              </span>
            )}
          </h3>
          <p className="text-[11px] font-mono text-text-tertiary truncate mt-0.5">
            {shortenPath(project.path)}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {/* Git section */}
      {project.git && (
        <div className="mb-3 space-y-1">
          <GitBadge branch={project.git.branch} status={project.git.status} />
          {project.git.lastCommit && (
            <p className="text-[11px] text-text-tertiary truncate pl-0.5">
              {project.git.lastCommit.message}
            </p>
          )}
        </div>
      )}

      {/* Stack tags */}
      {stack.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {stack.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded bg-surface-3 text-micro font-mono text-text-tertiary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
        {activeTasks > 0 && (
          <span>{activeTasks} task{activeTasks !== 1 ? 's' : ''}</span>
        )}
        {project.plan && <span>Has plan</span>}
        {project.hasClaudeDir && <span>.claude</span>}
      </div>

      {/* Health indicators */}
      {project.health && (
        <div className="mt-2">
          <HealthBadge health={project.health} compact />
        </div>
      )}

      {/* Quick actions (visible on hover) */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.api.launchClaude(project.path);
          }}
          className="p-1.5 rounded-button bg-surface-3 text-text-tertiary hover:text-accent hover:bg-surface-4 transition-colors"
          aria-label="Launch Claude Code"
          title="Launch Claude Code"
        >
          <ClaudeIcon size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenEditor(project.path);
          }}
          className="p-1.5 rounded-button bg-surface-3 text-text-tertiary hover:text-text-primary hover:bg-surface-4 transition-colors"
          title="Open in editor"
        >
          <PencilIcon size={14} />
        </button>
      </div>
    </div>
  );
})
