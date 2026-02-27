import React, { useMemo } from 'react';
import type { Project, ActiveSession } from '../../../shared/types';
import ProjectCard from './ProjectCard';
import ActiveSessions from './ActiveSessions';

interface DashboardProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  activeSessions?: ActiveSession[];
  getSessionForProject?: (projectPath: string) => ActiveSession | null;
}

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

export default function Dashboard({ projects, onSelectProject, activeSessions, getSessionForProject }: DashboardProps) {
  const { activeProjects, idleProjects, totalTasks, activeTasks, uncommitted } = useMemo(() => {
    const active = projects.filter((p) => p.status === 'active');
    const idle = projects.filter((p) => p.status === 'idle');
    const total = projects.reduce((sum, p) => sum + p.tasks.length, 0);
    const activeT = projects.reduce(
      (sum, p) => sum + p.tasks.filter((t) => t.status === 'in_progress').length,
      0
    );
    const dirty = projects.filter((p) => p.git && p.git.status === 'dirty').length;
    return {
      activeProjects: active,
      idleProjects: idle,
      totalTasks: total,
      activeTasks: activeT,
      uncommitted: dirty,
    };
  }, [projects]);

  const handleOpenEditor = (path: string) => {
    window.api.openInEditor(path);
  };

  const liveCount = activeSessions?.length ?? 0;

  return (
    <div className="p-6 space-y-8">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-4">
        <StatCard label="Projects" value={projects.length} />
        <StatCard label="Active" value={activeProjects.length} accent />
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

      {/* Active projects section */}
      {activeProjects.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-4">
            Active
          </h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {activeProjects.map((project) => (
              <ProjectCard
                key={project.path}
                project={project}
                onClick={onSelectProject}

                onOpenEditor={handleOpenEditor}
                isLive={!!getSessionForProject?.(project.path)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Idle projects section */}
      {idleProjects.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-4">
            Idle
          </h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {idleProjects.map((project) => (
              <ProjectCard
                key={project.path}
                project={project}
                onClick={onSelectProject}

                onOpenEditor={handleOpenEditor}
                isLive={!!getSessionForProject?.(project.path)}
              />
            ))}
          </div>
        </section>
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
