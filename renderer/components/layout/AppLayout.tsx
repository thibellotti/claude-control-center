import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import dynamic from 'next/dynamic';
import type { Project } from '../../../shared/types';
import Sidebar from './Sidebar';
import TopBar, { type TopBarProps } from './TopBar';

const ProjectWorkspace = dynamic(() => import('../project/ProjectWorkspace'), { ssr: false });
const PreviewWorkspace = dynamic(() => import('../preview/PreviewWorkspace'), { ssr: false });
const DirigirCanvas = dynamic(() => import('../dirigir/DirigirCanvas'), { ssr: false });

interface AppLayoutProps {
  children: React.ReactNode;
  selectedProject?: Project | null;
  onNavigate: (page: string) => void;
  onBack?: () => void;
  currentPage: string;
  pageTitle: string;
  onOpenSearch?: () => void;
  mode?: 'forma' | 'developer';
  activeProject?: TopBarProps['activeProject'];
  recentProjects?: TopBarProps['recentProjects'];
  onSwitchProject?: TopBarProps['onSwitchProject'];
}

export default function AppLayout({
  children,
  selectedProject,
  onNavigate,
  onBack,
  currentPage,
  pageTitle,
  onOpenSearch,
  mode = 'forma',
  activeProject,
  recentProjects,
  onSwitchProject,
}: AppLayoutProps) {
  const showProjectView = !!selectedProject;

  return (
    <div className="flex h-screen bg-surface-0 overflow-hidden">
      <Sidebar
        onNavigate={onNavigate}
        currentPage={currentPage}
      />
      <div className="flex flex-col flex-1 min-w-0">
        {!showProjectView && (
          <TopBar
            pageTitle={pageTitle}
            onOpenSearch={onOpenSearch}
            activeProject={activeProject}
            onBack={onBack}
            recentProjects={recentProjects}
            onSwitchProject={onSwitchProject}
          />
        )}
        {showProjectView ? (
          mode === 'forma' ? (
            <DirigirCanvas
              project={selectedProject}
              onBack={onBack || (() => onNavigate('dashboard'))}
            />
          ) : (
            <Group orientation="horizontal" className="flex-1">
              <Panel defaultSize={50} minSize={30}>
                <ProjectWorkspace
                  project={selectedProject}
                  onBack={onBack || (() => onNavigate('dashboard'))}
                />
              </Panel>
              <Separator className="w-1 bg-border-subtle hover:bg-accent/40 transition-colors cursor-col-resize" />
              <Panel defaultSize={50} minSize={25}>
                <PreviewWorkspace project={selectedProject} />
              </Panel>
            </Group>
          )
        ) : (
          <main className="flex-1 overflow-y-auto">{children}</main>
        )}
      </div>
    </div>
  );
}
