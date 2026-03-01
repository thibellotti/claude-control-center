import React, { useCallback, useMemo, useState } from 'react';
import { useProjectContext } from '../../hooks/useProjectContext';
import ProjectCard from './ProjectCard';
import ActiveSessions from './ActiveSessions';
import { ChevronDownIcon } from '../icons';
import type { Project } from '../../../shared/types';

// ---------------------------------------------------------------------------
// Stats bar card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
  warn?: boolean;
}

function StatCard({ label, value, accent, warn }: StatCardProps) {
  let valueColor = 'text-text-primary';
  if (accent) valueColor = 'text-accent';
  if (warn) valueColor = 'text-status-dirty';

  return (
    <div className="flex-1 min-w-[140px] bg-surface-1 border border-border-subtle rounded-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1">
        {label}
      </p>
      <p className={`text-2xl font-semibold ${valueColor}`}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client accordion section
// ---------------------------------------------------------------------------

interface ClientGroup {
  client: string;
  projects: Project[];
  hasActive: boolean;
  latestActivity: number;
}

interface ClientAccordionProps {
  group: ClientGroup;
  onSelectProject: (project: Project) => void;
  onOpenEditor: (path: string) => void;
  onOpenProject?: (path: string, mode: 'claude' | 'claude --dangerously-skip-permissions') => void;
  getSessionForProject: (projectPath: string) => ReturnType<ReturnType<typeof useProjectContext>['getSessionForProject']>;
  defaultOpen: boolean;
}

function ClientAccordion({
  group,
  onSelectProject,
  onOpenEditor,
  onOpenProject,
  getSessionForProject,
  defaultOpen,
}: ClientAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border border-border-subtle rounded-card overflow-hidden">
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-surface-1 hover:bg-surface-2 transition-colors cursor-pointer select-none"
      >
        <ChevronDownIcon
          size={12}
          className={`text-text-tertiary transition-transform duration-200 ${
            open ? '' : '-rotate-90'
          }`}
        />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
          {group.client}
        </span>
        <span className="text-[11px] text-text-tertiary ml-1">
          {group.projects.length}
        </span>
        {group.hasActive && (
          <span className="relative flex h-2 w-2 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-status-active" />
          </span>
        )}
      </button>

      {/* Accordion body */}
      {open && (
        <div className="px-4 pb-4 pt-2">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {group.projects.map((project) => (
              <ProjectCard
                key={project.path}
                project={project}
                onClick={onSelectProject}
                onOpenEditor={onOpenEditor}
                onOpenProject={onOpenProject}
                isLive={!!getSessionForProject(project.path)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const UNCATEGORIZED = 'Uncategorized';

export default function Dashboard() {
  const { projects, onSelectProject, onOpenProject, activeSessions, getSessionForProject } = useProjectContext();

  // Compute stats
  const { totalTasks, activeTasks, uncommitted, clientCount } = useMemo(() => {
    const total = projects.reduce((sum, p) => sum + p.tasks.length, 0);
    const activeT = projects.reduce(
      (sum, p) => sum + p.tasks.filter((t) => t.status === 'in_progress').length,
      0,
    );
    const dirty = projects.filter((p) => p.git && p.git.status === 'dirty').length;
    const clients = new Set(projects.map((p) => p.client || UNCATEGORIZED));
    return {
      totalTasks: total,
      activeTasks: activeT,
      uncommitted: dirty,
      clientCount: clients.size,
    };
  }, [projects]);

  // Group projects by client
  const clientGroups: ClientGroup[] = useMemo(() => {
    const groupMap = new Map<string, Project[]>();

    for (const project of projects) {
      const key = project.client || UNCATEGORIZED;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(project);
    }

    // Build groups with metadata
    const groups: ClientGroup[] = [];
    for (const [client, clientProjects] of groupMap) {
      // Sort projects within group by lastActivity (newest first)
      const sorted = [...clientProjects].sort((a, b) => b.lastActivity - a.lastActivity);
      const hasActive = sorted.some((p) => p.status === 'active');
      const latestActivity = sorted.length > 0 ? sorted[0].lastActivity : 0;

      groups.push({ client, projects: sorted, hasActive, latestActivity });
    }

    // Sort groups: by latest activity descending, but Uncategorized always last
    groups.sort((a, b) => {
      if (a.client === UNCATEGORIZED && b.client !== UNCATEGORIZED) return 1;
      if (b.client === UNCATEGORIZED && a.client !== UNCATEGORIZED) return -1;
      return b.latestActivity - a.latestActivity;
    });

    return groups;
  }, [projects]);

  const handleOpenEditor = useCallback((path: string) => {
    window.api.openInEditor(path);
  }, []);

  const liveCount = activeSessions.length;

  return (
    <div className="p-6 space-y-8">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-4">
        <StatCard label="Projects" value={projects.length} />
        <StatCard label="Clients" value={clientCount} />
        <StatCard
          label="Tasks"
          value={`${activeTasks}/${totalTasks}`}
        />
        <StatCard
          label="Uncommitted"
          value={uncommitted}
          warn={uncommitted > 0}
        />
        <StatCard label="Live Sessions" value={liveCount} accent={liveCount > 0} />
      </div>

      {/* Live sessions section */}
      <ActiveSessions sessions={activeSessions} />

      {/* Client-grouped project sections */}
      {clientGroups.length > 0 && (
        <div className="space-y-4">
          {clientGroups.map((group) => (
            <ClientAccordion
              key={group.client}
              group={group}
              onSelectProject={onSelectProject}
              onOpenEditor={handleOpenEditor}
              onOpenProject={onOpenProject}
              getSessionForProject={getSessionForProject}
              defaultOpen={group.hasActive}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-tertiary text-sm">No projects found.</p>
          <p className="text-text-tertiary text-xs mt-1">
            Projects with a .claude directory will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
