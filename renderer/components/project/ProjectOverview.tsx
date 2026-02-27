import React from 'react';
import type { Project } from '../../../shared/types';
import GitBadge from '../shared/GitBadge';
import MarkdownView from '../shared/MarkdownView';

interface ProjectOverviewProps {
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

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-3">
      {title}
    </h3>
  );
}

export default function ProjectOverview({ project }: ProjectOverviewProps) {
  return (
    <div className="space-y-8 py-6">
      {/* Repository section */}
      {project.git && (
        <section>
          <SectionHeader title="Repository" />
          <div className="bg-surface-1 border border-border-subtle rounded-card p-4 space-y-3">
            <GitBadge branch={project.git.branch} status={project.git.status} />
            {project.git.lastCommit && (
              <div className="text-sm">
                <span className="font-mono text-[11px] text-text-tertiary">
                  {project.git.lastCommit.hash.slice(0, 7)}
                </span>
                <span className="text-text-secondary ml-2">
                  {project.git.lastCommit.message}
                </span>
                <span className="text-text-tertiary ml-2 text-xs">
                  {formatRelativeTime(project.git.lastCommit.date)}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Package section */}
      {project.packageJson && (
        <section>
          <SectionHeader title="Package" />
          <div className="bg-surface-1 border border-border-subtle rounded-card p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-tertiary text-xs">Name</span>
                <p className="text-text-primary font-mono text-xs mt-0.5">
                  {project.packageJson.name}
                </p>
              </div>
              <div>
                <span className="text-text-tertiary text-xs">Version</span>
                <p className="text-text-primary font-mono text-xs mt-0.5">
                  {project.packageJson.version}
                </p>
              </div>
              <div>
                <span className="text-text-tertiary text-xs">Dependencies</span>
                <p className="text-text-primary text-xs mt-0.5">
                  {Object.keys(project.packageJson.dependencies).length} deps
                  {' / '}
                  {Object.keys(project.packageJson.devDependencies).length} dev
                </p>
              </div>
              <div>
                <span className="text-text-tertiary text-xs">Scripts</span>
                <p className="text-text-primary text-xs mt-0.5">
                  {Object.keys(project.packageJson.scripts).length} scripts
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Plan section */}
      {project.plan && (
        <section>
          <SectionHeader title="Plan" />
          <div className="bg-surface-1 border border-border-subtle rounded-card p-4 overflow-y-auto max-h-[500px]">
            <MarkdownView content={project.plan} />
          </div>
        </section>
      )}

      {/* Claude Config section */}
      {project.claudeMd && (
        <section>
          <SectionHeader title="Claude Config" />
          <div className="bg-surface-1 border border-border-subtle rounded-card p-4 overflow-y-auto max-h-[400px]">
            <MarkdownView content={project.claudeMd} />
          </div>
        </section>
      )}
    </div>
  );
}
