import { useState, useCallback, useRef } from 'react';
import type { Project } from '../../shared/types';
import type { CommandResult } from '../hooks/useCommandPalette';
import AppLayout from '../components/layout/AppLayout';
import Dashboard from '../components/dashboard/Dashboard';
import ProjectDetail from '../components/project/ProjectDetail';
import SettingsPage from '../components/settings/SettingsPage';
import PromptLibrary from '../components/prompts/PromptLibrary';
import CommandPalette from '../components/search/CommandPalette';
import { useProjects, useProjectDetail } from '../hooks/useProjects';
import { useCommandPalette } from '../hooks/useCommandPalette';
import { useToast } from '../hooks/useToast';
import { useActiveSessions } from '../hooks/useSessions';

export default function Home() {
  const { addToast } = useToast();
  const lastToastTime = useRef(0);

  // Only show toasts for settings changes; suppress routine task/team updates
  const handleRefresh = useCallback(
    (hints: string[]) => {
      const now = Date.now();
      if (now - lastToastTime.current < 15000) return; // Max 1 toast per 15s
      lastToastTime.current = now;

      if (hints.includes('__settings__')) {
        addToast('Settings updated', 'info');
      }
      // Silently refresh for task/team changes — no toast needed
    },
    [addToast]
  );

  const { projects, loading } = useProjects(handleRefresh);
  const { sessions: activeSessions, getSessionForProject } = useActiveSessions();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'project' | 'settings' | 'prompts'>('dashboard');
  const [selectedProjectPath, setSelectedProjectPath] = useState<string | null>(null);
  const { project: selectedProject } = useProjectDetail(
    currentPage === 'project' ? selectedProjectPath : null
  );

  const { open, setOpen, query, setQuery, results } = useCommandPalette(projects);

  // Sidebar and Dashboard pass a Project object; we extract the path
  const handleSelectProject = useCallback((project: Project) => {
    setSelectedProjectPath(project.path);
    setCurrentPage('project');
  }, []);

  const handleNavigate = useCallback((page: string) => {
    if (page === 'dashboard' || page === 'settings' || page === 'prompts') {
      setCurrentPage(page);
      setSelectedProjectPath(null);
    }
  }, []);

  const handleSearchSelect = useCallback(
    (result: CommandResult) => {
      if (result.type === 'project' || result.type === 'plan') {
        setSelectedProjectPath(result.data.path);
        setCurrentPage('project');
      } else if (result.type === 'task') {
        setSelectedProjectPath(result.data.project.path);
        setCurrentPage('project');
      }
      setOpen(false);
    },
    [setOpen]
  );

  const pageTitle =
    currentPage === 'dashboard'
      ? 'Dashboard'
      : currentPage === 'settings'
      ? 'Settings'
      : currentPage === 'prompts'
      ? 'Prompt Library'
      : selectedProject?.name || 'Project';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-0">
        <div className="flex items-center gap-2 text-text-tertiary text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse" />
          Loading projects...
        </div>
      </div>
    );
  }

  return (
    <>
      <AppLayout
        projects={projects}
        selectedPath={selectedProjectPath}
        onSelectProject={handleSelectProject}
        onNavigate={handleNavigate}
        currentPage={currentPage === 'project' ? 'dashboard' : currentPage as string}
        pageTitle={pageTitle}
        onOpenSearch={() => setOpen(true)}
      >
        {currentPage === 'dashboard' && (
          <Dashboard
            projects={projects}
            onSelectProject={handleSelectProject}
            activeSessions={activeSessions}
            getSessionForProject={getSessionForProject}
          />
        )}
        {currentPage === 'project' && selectedProject && (
          <ProjectDetail
            project={selectedProject}
            onBack={() => handleNavigate('dashboard')}
          />
        )}
        {currentPage === 'prompts' && <PromptLibrary />}
        {currentPage === 'settings' && <SettingsPage />}
      </AppLayout>

      <CommandPalette
        open={open}
        query={query}
        results={results}
        onQueryChange={setQuery}
        onClose={() => setOpen(false)}
        onSelect={handleSearchSelect}
      />
    </>
  );
}
