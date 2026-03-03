import React, { useState } from 'react';
import type { Project, TaskItem } from '../../../shared/types';
import { useProjectDetailData } from '../../hooks/useProjectDetailData';
import GitBadge from '../shared/GitBadge';
import HealthBadge from '../shared/HealthBadge';
import MarkdownView from '../shared/MarkdownView';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ClaudeIcon,
  ExternalLinkIcon,
  CommitIcon,
  PRIcon,
  ClockIcon,
  EditIcon,
  EyeIcon,
} from '../icons';
import { useProjectContext } from '../../hooks/useProjectContext';
import StatCard from '../shared/StatCard';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectDetailProps {
  project: Project;
  onOpenInClaude: (mode: 'claude' | 'claude --dangerously-skip-permissions') => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortenPath(fullPath: string): string {
  const home = fullPath.replace(/^\/Users\/[^/]+/, '~');
  return home;
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

function detectFrameworks(deps: Record<string, string>, devDeps: Record<string, string>): string[] {
  const all = { ...deps, ...devDeps };
  const frameworks: string[] = [];
  const checks: [string, string][] = [
    ['next', 'Next.js'],
    ['react', 'React'],
    ['vue', 'Vue'],
    ['svelte', 'Svelte'],
    ['@angular/core', 'Angular'],
    ['express', 'Express'],
    ['fastify', 'Fastify'],
    ['tailwindcss', 'Tailwind CSS'],
    ['three', 'Three.js'],
    ['typescript', 'TypeScript'],
    ['vite', 'Vite'],
    ['webpack', 'Webpack'],
    ['prisma', 'Prisma'],
    ['drizzle-orm', 'Drizzle'],
    ['@supabase/supabase-js', 'Supabase'],
    ['framer-motion', 'Framer Motion'],
    ['electron', 'Electron'],
  ];
  for (const [pkg, label] of checks) {
    if (all[pkg]) frameworks.push(label);
  }
  return frameworks;
}

function formatDuration(startStr: string, endStr: string): string {
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  const mins = Math.round((end - start) / 60000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

// ---------------------------------------------------------------------------
// CollapsibleSection
// ---------------------------------------------------------------------------

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = false, count, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border border-border-subtle rounded-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-surface-1 hover:bg-surface-2 transition-colors cursor-pointer select-none"
      >
        <ChevronDownIcon
          size={12}
          className={`text-text-tertiary transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          {title}
        </span>
        {count !== undefined && (
          <span className="text-xs text-text-tertiary ml-1">{count}</span>
        )}
      </button>
      {open && <div className="px-4 pb-4 pt-3">{children}</div>}
    </section>
  );
}

// StatCard is now imported from shared/StatCard

// ---------------------------------------------------------------------------
// Task status helpers
// ---------------------------------------------------------------------------

function taskStatusDot(status: TaskItem['status']): string {
  switch (status) {
    case 'in_progress': return 'bg-accent';
    case 'pending': return 'bg-text-tertiary';
    case 'completed': return 'bg-status-clean';
    default: return 'bg-text-tertiary';
  }
}

function taskStatusOrder(status: TaskItem['status']): number {
  switch (status) {
    case 'in_progress': return 0;
    case 'pending': return 1;
    case 'completed': return 2;
    default: return 3;
  }
}

// ---------------------------------------------------------------------------
// ProjectDetail
// ---------------------------------------------------------------------------

export default function ProjectDetail({ project, onOpenInClaude, onBack }: ProjectDetailProps) {
  const { onOpenVisualEditor } = useProjectContext();
  const { github, sessionTimelines, loading: extraLoading } = useProjectDetailData(project.path);

  const activeTasks = project.tasks.filter((t) => t.status !== 'deleted');
  const inProgressCount = activeTasks.filter((t) => t.status === 'in_progress').length;
  const sortedTasks = [...activeTasks].sort((a, b) => taskStatusOrder(a.status) - taskStatusOrder(b.status));
  const frameworks = project.packageJson
    ? detectFrameworks(project.packageJson.dependencies, project.packageJson.devDependencies)
    : [];

  const daysSinceLastCommit = project.health?.daysSinceLastCommit;

  return (
    <div className="h-full overflow-y-auto bg-surface-0">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* ----------------------------------------------------------------- */}
        {/* Header                                                            */}
        {/* ----------------------------------------------------------------- */}
        <header>
          {/* Back button */}
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-text-tertiary hover:text-text-secondary text-xs mb-4 transition-colors"
          >
            <ChevronLeftIcon size={12} />
            Dashboard
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-semibold text-text-primary truncate">
                  {project.name}
                </h1>
                {project.client && (
                  <span className="shrink-0 px-2 py-1 rounded-full bg-surface-3 text-xs font-medium text-text-secondary">
                    {project.client}
                  </span>
                )}
                <span
                  className={`shrink-0 w-2 h-2 rounded-full ${
                    project.status === 'active' ? 'bg-status-active' : 'bg-status-idle'
                  }`}
                  title={project.status}
                />
              </div>
              <p className="text-xs font-mono text-text-tertiary truncate">
                {shortenPath(project.path)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onOpenInClaude('claude')}
                className="flex items-center gap-1 px-3 py-1 rounded-button text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                <ClaudeIcon size={12} />
                Open in Claude
              </button>
              <button
                onClick={() => onOpenInClaude('claude --dangerously-skip-permissions')}
                className="flex items-center gap-1 px-3 py-1 rounded-button text-xs font-medium bg-status-dirty/10 text-status-dirty hover:bg-status-dirty/20 transition-colors"
              >
                Autopilot
              </button>
              {onOpenVisualEditor && (
                <button
                  onClick={() => onOpenVisualEditor(project.path, 'auto')}
                  className="flex items-center gap-1 px-3 py-1 rounded-button text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                >
                  <EyeIcon size={12} />
                  Visual Editor
                </button>
              )}
              <button
                onClick={() => window.api.openInEditor(project.path)}
                className="flex items-center gap-1 px-2 py-1 rounded-button text-xs font-medium text-text-secondary bg-surface-2 border border-border-subtle hover:border-border-default transition-colors"
              >
                <ExternalLinkIcon size={12} />
                Editor
              </button>
              <button
                onClick={() => window.api.openInFinder(project.path)}
                className="flex items-center gap-1 px-2 py-1 rounded-button text-xs font-medium text-text-secondary bg-surface-2 border border-border-subtle hover:border-border-default transition-colors"
              >
                Finder
              </button>
            </div>
          </div>
        </header>

        {/* ----------------------------------------------------------------- */}
        {/* Quick Stats                                                       */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex flex-wrap gap-3">
          {project.git && (
            <>
              <StatCard
                label="Branch"
                value={project.git.branch}
                size="compact"
              />
              <StatCard
                label="Status"
                value={project.git.status === 'clean' ? 'Clean' : `${project.health?.uncommittedCount ?? 0} uncommitted`}
                warn={project.git.status === 'dirty'}
                size="compact"
              />
              {project.git.lastCommit && (
                <StatCard
                  label="Last Commit"
                  value={formatRelativeTime(project.git.lastCommit.date)}
                  warn={daysSinceLastCommit != null && daysSinceLastCommit > 7}
                  size="compact"
                />
              )}
              {(project.git.ahead > 0 || project.git.behind > 0) && (
                <StatCard
                  label="Remote"
                  value={`+${project.git.ahead} / -${project.git.behind}`}
                  warn={project.git.behind > 0}
                  size="compact"
                />
              )}
            </>
          )}
          <StatCard
            label="Tasks"
            value={`${inProgressCount}/${activeTasks.length}`}
            accent={inProgressCount > 0}
            size="compact"
          />
        </div>

        {/* Health */}
        {project.health && (
          <HealthBadge health={project.health} />
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Plan                                                              */}
        {/* ----------------------------------------------------------------- */}
        {project.plan && (
          <CollapsibleSection title="Plan" defaultOpen>
            <div className="flex justify-end mb-2">
              <button
                onClick={() => window.api.openInEditor(project.path + '/PLAN.md')}
                className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <EditIcon size={10} />
                Edit
              </button>
            </div>
            <div className="overflow-y-auto max-h-[500px] min-w-0">
              <MarkdownView content={project.plan} />
            </div>
          </CollapsibleSection>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Tasks                                                             */}
        {/* ----------------------------------------------------------------- */}
        {activeTasks.length > 0 && (
          <CollapsibleSection title="Tasks" defaultOpen count={activeTasks.length}>
            <div className="space-y-1">
              {sortedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-2 text-xs py-1 ${
                    task.status === 'completed' ? 'opacity-50' : ''
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${taskStatusDot(task.status)}`} />
                  <span className={`text-text-primary min-w-0 truncate ${
                    task.status === 'completed' ? 'line-through text-text-tertiary' : ''
                  }`}>
                    {task.subject}
                  </span>
                  {task.owner && (
                    <span className="shrink-0 px-1 py-1 rounded-full bg-surface-3 text-micro text-text-tertiary">
                      {task.owner}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Git                                                               */}
        {/* ----------------------------------------------------------------- */}
        {project.git && (
          <CollapsibleSection title="Git" defaultOpen>
            <div className="space-y-4">
              {/* Branch info */}
              <div className="flex items-center gap-3 flex-wrap">
                <GitBadge branch={project.git.branch} status={project.git.status} />
                {(project.git.ahead > 0 || project.git.behind > 0) && (
                  <span className="text-xs text-text-tertiary">
                    {project.git.ahead > 0 && <span className="text-status-clean">+{project.git.ahead} ahead</span>}
                    {project.git.ahead > 0 && project.git.behind > 0 && ' / '}
                    {project.git.behind > 0 && <span className="text-status-dirty">-{project.git.behind} behind</span>}
                  </span>
                )}
                {project.health && project.health.uncommittedCount > 0 && (
                  <span className="text-xs text-status-dirty">
                    {project.health.uncommittedCount} uncommitted
                  </span>
                )}
              </div>

              {/* Recent commits from GitHub data */}
              {github && github.commits.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">
                    Recent Commits
                  </p>
                  <div className="space-y-1">
                    {github.commits.slice(0, 10).map((commit) => (
                      <div key={commit.hash} className="flex items-baseline gap-2 text-xs min-w-0">
                        <CommitIcon size={10} className="text-text-tertiary shrink-0 relative top-[1px]" />
                        <span className="font-mono text-xs text-text-tertiary shrink-0">
                          {commit.hash.slice(0, 7)}
                        </span>
                        <span className="text-text-secondary truncate">{commit.message}</span>
                        <span className="text-text-tertiary text-xs shrink-0">
                          {formatRelativeTime(commit.date)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Open PRs */}
              {github && github.pullRequests.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">
                    Pull Requests
                  </p>
                  <div className="space-y-1">
                    {github.pullRequests.map((pr) => (
                      <div key={pr.number} className="flex items-center gap-2 text-xs min-w-0">
                        <PRIcon size={10} className="text-text-tertiary shrink-0" />
                        <span className="text-text-tertiary shrink-0">#{pr.number}</span>
                        <span className="text-text-secondary truncate">{pr.title}</span>
                        <span className={`shrink-0 px-1 py-1 rounded-full text-micro font-medium ${
                          pr.state === 'open'
                            ? 'bg-status-clean/10 text-status-clean'
                            : pr.state === 'merged'
                            ? 'bg-accent/10 text-accent'
                            : 'bg-status-dirty/10 text-status-dirty'
                        }`}>
                          {pr.state}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last commit fallback (if no GitHub data) */}
              {(!github || github.commits.length === 0) && project.git.lastCommit && (
                <div className="flex items-baseline gap-2 text-xs min-w-0">
                  <span className="font-mono text-xs text-text-tertiary shrink-0">
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
          </CollapsibleSection>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Tech Stack                                                        */}
        {/* ----------------------------------------------------------------- */}
        {project.packageJson && (
          <CollapsibleSection title="Tech Stack" defaultOpen>
            <div className="space-y-4">
              {/* Framework pills */}
              {frameworks.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {frameworks.map((fw) => (
                    <span
                      key={fw}
                      className="px-2 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium"
                    >
                      {fw}
                    </span>
                  ))}
                </div>
              )}

              {/* Scripts */}
              {Object.keys(project.packageJson.scripts).length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">
                    Scripts
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {Object.entries(project.packageJson.scripts).map(([name, cmd]) => (
                      <div key={name} className="flex items-baseline gap-2 text-xs min-w-0">
                        <span className="font-mono text-accent shrink-0">{name}</span>
                        <span className="font-mono text-text-tertiary truncate text-xs">{cmd}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dependencies */}
              <details className="group">
                <summary className="text-xs font-medium uppercase tracking-wider text-text-tertiary cursor-pointer hover:text-text-secondary transition-colors">
                  Dependencies ({Object.keys(project.packageJson.dependencies).length})
                </summary>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(project.packageJson.dependencies).map(([pkg, ver]) => (
                    <span key={pkg} className="px-1 py-1 rounded bg-surface-2 text-micro font-mono text-text-secondary">
                      {pkg}@{ver}
                    </span>
                  ))}
                </div>
              </details>

              <details className="group">
                <summary className="text-xs font-medium uppercase tracking-wider text-text-tertiary cursor-pointer hover:text-text-secondary transition-colors">
                  Dev Dependencies ({Object.keys(project.packageJson.devDependencies).length})
                </summary>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(project.packageJson.devDependencies).map(([pkg, ver]) => (
                    <span key={pkg} className="px-1 py-1 rounded bg-surface-2 text-micro font-mono text-text-secondary">
                      {pkg}@{ver}
                    </span>
                  ))}
                </div>
              </details>
            </div>
          </CollapsibleSection>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* CLAUDE.md                                                         */}
        {/* ----------------------------------------------------------------- */}
        {project.claudeMd && (
          <CollapsibleSection title="CLAUDE.md">
            <div className="overflow-y-auto max-h-[400px] min-w-0">
              <MarkdownView content={project.claudeMd} />
            </div>
          </CollapsibleSection>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Sessions                                                          */}
        {/* ----------------------------------------------------------------- */}
        {sessionTimelines.length > 0 && (
          <CollapsibleSection title="Sessions" defaultOpen count={sessionTimelines.length}>
            <div className="space-y-1">
              {sessionTimelines.slice(0, 10).map((session) => (
                <div key={session.sessionId} className="flex items-center gap-3 text-xs py-1">
                  <ClockIcon size={10} className="text-text-tertiary shrink-0" />
                  <span className="text-text-secondary shrink-0">
                    {new Date(session.startTime).toLocaleDateString()}{' '}
                    {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-text-tertiary text-xs">
                    {formatDuration(session.startTime, session.endTime)}
                  </span>
                  <span className="text-text-tertiary text-xs">
                    {session.actionCount} actions
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Loading indicator for extra data */}
        {extraLoading && (
          <div className="flex items-center gap-2 text-text-tertiary text-xs py-2">
            <span className="w-2 h-2 rounded-full bg-text-tertiary animate-pulse" />
            Loading extra data...
          </div>
        )}
      </div>
    </div>
  );
}
