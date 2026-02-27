import React from 'react';
import type { Project } from '../../../shared/types';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AppLayoutProps {
  children: React.ReactNode;
  projects: Project[];
  selectedPath: string | null;
  onSelectProject: (project: Project) => void;
  onNavigate: (page: string) => void;
  currentPage: string;
  pageTitle: string;
  onOpenSearch?: () => void;
}

export default function AppLayout({
  children,
  projects,
  selectedPath,
  onSelectProject,
  onNavigate,
  currentPage,
  pageTitle,
  onOpenSearch,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-surface-0 overflow-hidden">
      <Sidebar
        projects={projects}
        selectedPath={selectedPath}
        onSelectProject={onSelectProject}
        onNavigate={onNavigate}
        currentPage={currentPage}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar pageTitle={pageTitle} onOpenSearch={onOpenSearch} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
