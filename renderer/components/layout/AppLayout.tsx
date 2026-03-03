import React from 'react';
import Sidebar from './Sidebar';
import TopBar, { type TopBarProps } from './TopBar';

interface AppLayoutProps {
  children: React.ReactNode;
  onNavigate: (page: string) => void;
  onBack?: () => void;
  currentPage: string;
  pageTitle: string;
  onOpenSearch?: () => void;
  activeProject?: TopBarProps['activeProject'];
  recentProjects?: TopBarProps['recentProjects'];
  onSwitchProject?: TopBarProps['onSwitchProject'];
}

export default function AppLayout({
  children,
  onNavigate,
  onBack,
  currentPage,
  pageTitle,
  onOpenSearch,
  activeProject,
  recentProjects,
  onSwitchProject,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-surface-0 overflow-hidden">
      <Sidebar
        onNavigate={onNavigate}
        currentPage={currentPage}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar
          pageTitle={pageTitle}
          onOpenSearch={onOpenSearch}
          activeProject={activeProject}
          onBack={onBack}
          recentProjects={recentProjects}
          onSwitchProject={onSwitchProject}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
