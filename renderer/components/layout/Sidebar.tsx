import React, { useState } from 'react';
import type { Project } from '../../../shared/types';

interface SidebarProps {
  projects: Project[];
  selectedPath: string | null;
  onSelectProject: (project: Project) => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

// SVG Icons
function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Sidebar({
  projects,
  selectedPath,
  onSelectProject,
  onNavigate,
  currentPage,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <aside
      className={`flex flex-col h-full bg-surface-1 border-r border-border-subtle transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-[52px] px-4 border-b border-border-subtle shrink-0">
        {!collapsed && (
          <span className="text-xs font-semibold tracking-wider uppercase text-text-secondary">
            Control Center
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-button text-text-tertiary hover:text-text-secondary hover:bg-surface-3 transition-colors"
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
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {!collapsed && (
          <span className="block px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase text-text-tertiary">
            Projects
          </span>
        )}
        {projects.map((project) => {
          const isSelected = selectedPath === project.path;
          return (
            <button
              key={project.path}
              onClick={() => onSelectProject(project)}
              className={`flex items-center gap-2.5 w-full px-3 py-1.5 rounded-button text-sm transition-colors ${
                isSelected
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
              } ${collapsed ? 'justify-center' : ''}`}
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
