import React, { createContext, useContext } from 'react';
import type { Project, ActiveSession } from '../../shared/types';

interface ProjectContextValue {
  projects: Project[];
  selectedProjectPath: string | null;
  onSelectProject: (project: Project) => void;
  onOpenProject: (path: string, mode: 'claude' | 'claude --dangerously-skip-permissions') => void;
  activeProjectPath: string | null;
  activeSessions: ActiveSession[];
  getSessionForProject: (projectPath: string) => ActiveSession | null;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ProjectContextValue;
}) {
  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return ctx;
}
