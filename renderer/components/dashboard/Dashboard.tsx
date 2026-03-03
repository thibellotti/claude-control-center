import React, { useMemo, useState } from 'react';
import { useProjectContext } from '../../hooks/useProjectContext';
import { useClients } from '../../hooks/useClients';
import ProjectCard from './ProjectCard';
import ClientWorkspaceCard from './ClientWorkspaceCard';
import ActiveSessions from './ActiveSessions';
import { ChevronDownIcon } from '../icons';
import type { Project } from '../../../shared/types';
import StatCard from '../shared/StatCard';

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
  onOpenProject?: (path: string, mode: 'claude' | 'claude --dangerously-skip-permissions') => void;
  getSessionForProject: (projectPath: string) => ReturnType<ReturnType<typeof useProjectContext>['getSessionForProject']>;
  defaultOpen: boolean;
}

function ClientAccordion({
  group,
  onSelectProject,
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
        <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          {group.client}
        </span>
        <span className="text-xs text-text-tertiary ml-1">
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
  const { projects, onSelectProject, onOpenProject, onSelectClient, activeSessions, getSessionForProject } = useProjectContext();
  const { clients } = useClients();

  // Compute stats
  const { totalTasks, activeTasks, uncommitted, clientCount } = useMemo(() => {
    const total = projects.reduce((sum, p) => sum + p.tasks.length, 0);
    const activeT = projects.reduce(
      (sum, p) => sum + p.tasks.filter((t) => t.status === 'in_progress').length,
      0,
    );
    const dirty = projects.filter((p) => p.git && p.git.status === 'dirty').length;
    const clientNames = new Set(projects.map((p) => p.client || UNCATEGORIZED));
    return {
      totalTasks: total,
      activeTasks: activeT,
      uncommitted: dirty,
      clientCount: clientNames.size,
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

  const liveCount = activeSessions.length;

  // Compute per-client project lists and active session counts
  const clientCardData = useMemo(() => {
    return clients.map((ws) => {
      const wsProjects = projects.filter((p) => p.client === ws.name);
      const sessionCount = wsProjects.filter((p) => !!getSessionForProject(p.path)).length;
      return { workspace: ws, projects: wsProjects, activeSessions: sessionCount };
    });
  }, [clients, projects, getSessionForProject]);

  // Projects without a client workspace
  const uncategorizedGroup = useMemo(
    () => clientGroups.find((g) => g.client === UNCATEGORIZED),
    [clientGroups],
  );

  // Client groups excluding Uncategorized (shown separately)
  const categorizedGroups = useMemo(
    () => clientGroups.filter((g) => g.client !== UNCATEGORIZED),
    [clientGroups],
  );

  return (
    <div className="p-6 space-y-6">
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
      <ActiveSessions
        sessions={activeSessions}
        onJumpToSession={(projectPath) => {
          const project = projects.find(p => p.path === projectPath);
          if (project) onSelectProject(project);
        }}
      />

      {/* Client workspace cards */}
      {clientCardData.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium tracking-wide uppercase text-text-tertiary pb-2 border-b border-border-subtle">
            Clients
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientCardData.map((data) => (
              <ClientWorkspaceCard
                key={data.workspace.id}
                workspace={data.workspace}
                projects={data.projects}
                activeSessions={data.activeSessions}
                onClick={() => onSelectClient(data.workspace.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Client-grouped project sections (excluding Uncategorized) */}
      {categorizedGroups.length > 0 && (
        <div className="space-y-4">
          {categorizedGroups.map((group) => (
            <ClientAccordion
              key={group.client}
              group={group}
              onSelectProject={onSelectProject}
              onOpenProject={onOpenProject}
              getSessionForProject={getSessionForProject}
              defaultOpen={group.hasActive}
            />
          ))}
        </div>
      )}

      {/* Uncategorized projects */}
      {uncategorizedGroup && uncategorizedGroup.projects.length > 0 && (
        <ClientAccordion
          group={uncategorizedGroup}
          onSelectProject={onSelectProject}
          onOpenProject={onOpenProject}
          getSessionForProject={getSessionForProject}
          defaultOpen={uncategorizedGroup.hasActive}
        />
      )}

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-text-secondary text-sm font-medium">No projects yet</p>
          <p className="text-text-tertiary text-xs">
            Add a project folder to get started. Projects with a <code className="px-1 py-0.5 rounded bg-surface-2 text-text-secondary font-mono">.claude</code> directory will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
