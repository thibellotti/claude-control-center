import React, { useState } from 'react';
import type { Project } from '../../../shared/types';
import GitBadge from '../shared/GitBadge';
import MarkdownView from '../shared/MarkdownView';
import HealthBadge from '../shared/HealthBadge';
import ClaudeMdEditor from '../editor/ClaudeMdEditor';
import { EditIcon } from '../icons';

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
  const [isEditingClaudeMd, setIsEditingClaudeMd] = useState(false);
  const claudeMdPath = project.path + '/CLAUDE.md';

  return (
    <div className="space-y-8 py-6 min-w-0">
      {/* Health section */}
      {project.health && (
        <section>
          <SectionHeader title="Health" />
          <HealthBadge health={project.health} />
        </section>
      )}

      {/* Repository section */}
      {project.git && (
        <section>
          <SectionHeader title="Repository" />
          <div className="bg-surface-1 border border-border-subtle rounded-card p-4 space-y-3">
            <GitBadge branch={project.git.branch} status={project.git.status} />
            {project.git.lastCommit && (
              <div className="text-sm flex items-baseline gap-2 min-w-0">
                <span className="font-mono text-[11px] text-text-tertiary shrink-0">
                  {project.git.lastCommit.hash.slice(0, 7)}
                </span>
                <span className="text-text-secondary truncate">
                  {project.git.lastCommit.message}
                </span>
                <span className="text-text-tertiary text-xs shrink-0">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
          <div className="bg-surface-1 border border-border-subtle rounded-card p-4 overflow-y-auto overflow-x-hidden max-h-[500px] min-w-0">
            <MarkdownView content={project.plan} />
          </div>
        </section>
      )}

      {/* Claude Config section — always visible to allow creating CLAUDE.md */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Claude Config
          </h3>
          {isEditingClaudeMd ? (
            <button
              onClick={() => setIsEditingClaudeMd(false)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-button text-[11px] font-medium text-text-secondary hover:text-text-primary bg-surface-2 border border-border-subtle hover:border-border-default transition-colors"
            >
              Done
            </button>
          ) : (
            <button
              onClick={() => setIsEditingClaudeMd(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-button text-[11px] font-medium text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <EditIcon />
              Edit
            </button>
          )}
        </div>
        {isEditingClaudeMd ? (
          <ClaudeMdEditor
            filePath={claudeMdPath}
            onSave={() => {
              // The project data will be refreshed by the file watcher
            }}
          />
        ) : project.claudeMd ? (
          <div className="bg-surface-1 border border-border-subtle rounded-card p-4 overflow-y-auto overflow-x-hidden max-h-[400px] min-w-0">
            <MarkdownView content={project.claudeMd} />
          </div>
        ) : (
          <div className="bg-surface-1 border border-border-subtle rounded-card p-4">
            <p className="text-xs text-text-tertiary text-center py-4">
              No CLAUDE.md file found. Click Edit to create one.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
