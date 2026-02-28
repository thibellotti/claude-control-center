import React from 'react';
import type { Project } from '../../../shared/types';
import GitBadge from '../shared/GitBadge';
import HealthBadge from '../shared/HealthBadge';
import MarkdownView from '../shared/MarkdownView';

interface ProjectInfoPanelProps {
  project: Project;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-micro font-semibold uppercase tracking-wider text-text-tertiary mb-1.5">
      {children}
    </h3>
  );
}

export default function ProjectInfoPanel({ project }: ProjectInfoPanelProps) {
  return (
    <div className="h-full overflow-y-auto px-4 py-3 space-y-4 bg-surface-0">
      {/* Health */}
      {project.health && (
        <section>
          <SectionLabel>Health</SectionLabel>
          <HealthBadge health={project.health} />
        </section>
      )}

      {/* Repository */}
      {project.git && (
        <section>
          <SectionLabel>Repository</SectionLabel>
          <div className="bg-surface-1 border border-border-subtle rounded-card p-3 space-y-2">
            <GitBadge branch={project.git.branch} status={project.git.status} />
            {project.git.lastCommit && (
              <div className="text-xs flex items-baseline gap-2 min-w-0">
                <span className="font-mono text-micro text-text-tertiary shrink-0">
                  {project.git.lastCommit.hash.slice(0, 7)}
                </span>
                <span className="text-text-secondary truncate">
                  {project.git.lastCommit.message}
                </span>
                <span className="text-text-tertiary text-micro shrink-0">
                  {formatRelativeTime(project.git.lastCommit.date)}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Package */}
      {project.packageJson && (
        <section>
          <SectionLabel>Package</SectionLabel>
          <div className="bg-surface-1 border border-border-subtle rounded-card p-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-text-tertiary text-micro">Name</span>
                <p className="text-text-primary font-mono text-[11px]">{project.packageJson.name}</p>
              </div>
              <div>
                <span className="text-text-tertiary text-micro">Version</span>
                <p className="text-text-primary font-mono text-[11px]">{project.packageJson.version}</p>
              </div>
              <div>
                <span className="text-text-tertiary text-micro">Dependencies</span>
                <p className="text-text-primary text-[11px]">
                  {Object.keys(project.packageJson.dependencies).length} deps / {Object.keys(project.packageJson.devDependencies).length} dev
                </p>
              </div>
              <div>
                <span className="text-text-tertiary text-micro">Scripts</span>
                <p className="text-text-primary text-[11px]">
                  {Object.keys(project.packageJson.scripts).length} scripts
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Plan (compact — show first few lines) */}
      {project.plan && (
        <section>
          <SectionLabel>Plan</SectionLabel>
          <div className="bg-surface-1 border border-border-subtle rounded-card p-3 overflow-y-auto max-h-[200px] min-w-0">
            <MarkdownView content={project.plan} />
          </div>
        </section>
      )}

      {/* Tasks + Teams summary */}
      <section>
        <SectionLabel>Activity</SectionLabel>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-text-secondary">
            <strong className="text-text-primary">{project.tasks.filter((t) => t.status !== 'deleted').length}</strong> tasks
          </span>
          <span className="text-text-secondary">
            <strong className="text-text-primary">{project.teams.length}</strong> teams
          </span>
        </div>
      </section>
    </div>
  );
}
