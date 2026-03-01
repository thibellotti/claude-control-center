import React, { useMemo, useState } from 'react';
import { useProjectContext } from '../../hooks/useProjectContext';
import { DashboardIcon, SettingsIcon, PromptsIcon, WorkspacesIcon, TerminalIcon, UsageIcon, ChevronLeftIcon, ChevronRightIcon, ClaudeIcon, ChevronDownIcon } from '../icons';

interface SidebarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export default function Sidebar({
  onNavigate,
  currentPage,
}: SidebarProps) {
  const { projects, selectedProjectPath, onSelectProject, onOpenProject, activeProjectPath } = useProjectContext();
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set());

  const UNCATEGORIZED = 'Uncategorized';

  const clientGroups = useMemo(() => {
    const groupMap = new Map<string, typeof projects>();
    for (const project of projects) {
      const key = project.client || UNCATEGORIZED;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(project);
    }
    const groups: { client: string; projects: typeof projects; latestActivity: number }[] = [];
    for (const [client, clientProjects] of groupMap) {
      const sorted = [...clientProjects].sort((a, b) => b.lastActivity - a.lastActivity);
      groups.push({ client, projects: sorted, latestActivity: sorted[0]?.lastActivity || 0 });
    }
    groups.sort((a, b) => {
      if (a.client === UNCATEGORIZED && b.client !== UNCATEGORIZED) return 1;
      if (b.client === UNCATEGORIZED && a.client !== UNCATEGORIZED) return -1;
      return b.latestActivity - a.latestActivity;
    });
    return groups;
  }, [projects]);

  const toggleClient = (client: string) => {
    setCollapsedClients((prev) => {
      const next = new Set(prev);
      if (next.has(client)) next.delete(client);
      else next.add(client);
      return next;
    });
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon size={16} /> },
    { id: 'sessions', label: 'Orchestrator', icon: <ClaudeIcon size={16} /> },
    { id: 'terminal', label: 'Terminal', icon: <TerminalIcon size={16} /> },
    { id: 'workspaces', label: 'Workspaces', icon: <WorkspacesIcon size={16} /> },
    { id: 'prompts', label: 'Prompts', icon: <PromptsIcon size={16} /> },
    { id: 'usage', label: 'Usage', icon: <UsageIcon size={16} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={16} /> },
  ];

  return (
    <aside
      className={`flex flex-col h-full bg-surface-1 border-r border-border-subtle transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Spacer for macOS traffic lights */}
      <div className="h-[52px] shrink-0 drag-region" />

      {/* Header — below traffic lights */}
      <div className="flex items-center justify-between px-4 pb-3 shrink-0">
        {!collapsed && (
          <span className="text-xs font-semibold tracking-wider uppercase text-text-secondary">
            Forma
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-button text-text-tertiary hover:text-text-secondary hover:bg-surface-3 transition-colors ${
            collapsed ? 'mx-auto' : ''
          }`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-2 py-3 space-y-1 shrink-0">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-button text-sm transition-colors ${
                isActive
                  ? 'bg-surface-3 text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
              } ${collapsed ? 'justify-center' : ''}`}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="px-4">
        <div className="border-t border-border-subtle" />
      </div>

      {/* Project list — grouped by client */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-1">
        {!collapsed && (
          <span className="block px-3 pb-2 text-micro font-semibold tracking-wider uppercase text-text-tertiary">
            Projects
          </span>
        )}
        {clientGroups.map((group) => {
          const isGroupCollapsed = collapsedClients.has(group.client);
          return (
            <div key={group.client}>
              {/* Client header */}
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleClient(group.client)}
                  className="flex items-center gap-1.5 w-full px-3 py-1 text-micro font-medium uppercase tracking-wider text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  <ChevronDownIcon
                    size={10}
                    className={`transition-transform duration-150 ${isGroupCollapsed ? '-rotate-90' : ''}`}
                  />
                  <span className="truncate">{group.client}</span>
                  <span className="ml-auto text-[10px] opacity-60">{group.projects.length}</span>
                </button>
              )}
              {/* Projects in group */}
              {!isGroupCollapsed &&
                group.projects.map((project) => {
                  const isSelected = selectedProjectPath === project.path;
                  const isActive = activeProjectPath === project.path;
                  return (
                    <button
                      key={project.path}
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey) {
                          onOpenProject(project.path, 'claude --dangerously-skip-permissions');
                        } else {
                          onSelectProject(project);
                        }
                      }}
                      className={`flex items-center gap-2.5 w-full py-1.5 rounded-button text-sm transition-colors ${
                        collapsed ? 'px-3 justify-center' : 'pl-6 pr-3'
                      } ${
                        isActive
                          ? 'bg-accent/10 text-accent border-l-2 border-accent'
                          : isSelected
                          ? 'bg-accent-muted text-accent'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                      }`}
                      aria-label={project.name}
                      title={collapsed ? project.name : isActive ? `${project.name} (active)` : undefined}
                    >
                      <span
                        className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                          isActive ? 'bg-accent' : project.status === 'active' ? 'bg-status-active' : 'bg-status-idle'
                        }`}
                      />
                      {!collapsed && (
                        <span className="truncate text-left">{project.name}</span>
                      )}
                    </button>
                  );
                })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
