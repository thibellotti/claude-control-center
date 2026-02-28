import React, { useState } from 'react';
import { useProjectContext } from '../../hooks/useProjectContext';
import { DashboardIcon, SettingsIcon, PromptsIcon, WorkspacesIcon, TerminalIcon, UsageIcon, ChevronLeftIcon, ChevronRightIcon, ClaudeIcon } from '../icons';

interface SidebarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export default function Sidebar({
  onNavigate,
  currentPage,
}: SidebarProps) {
  const { projects, selectedProjectPath, onSelectProject } = useProjectContext();
  const [collapsed, setCollapsed] = useState(false);

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

      {/* Project list */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
        {!collapsed && (
          <span className="block px-3 pb-2 text-micro font-semibold tracking-wider uppercase text-text-tertiary">
            Projects
          </span>
        )}
        {projects.map((project) => {
          const isSelected = selectedProjectPath === project.path;
          return (
            <button
              key={project.path}
              onClick={() => onSelectProject(project)}
              className={`flex items-center gap-2.5 w-full px-3 py-1.5 rounded-button text-sm transition-colors ${
                isSelected
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
              } ${collapsed ? 'justify-center' : ''}`}
              aria-label={project.name}
              title={collapsed ? project.name : undefined}
            >
              <span
                className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                  project.status === 'active' ? 'bg-status-active' : 'bg-status-idle'
                }`}
              />
              {!collapsed && (
                <span className="truncate text-left">{project.name}</span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
