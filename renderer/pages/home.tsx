import { useState, useCallback } from 'react';
import type { Project } from '../../shared/types';
import AppLayout from '../components/layout/AppLayout';
import Dashboard from '../components/dashboard/Dashboard';
import ProjectDetail from '../components/project/ProjectDetail';
import SettingsPage from '../components/settings/SettingsPage';
import CommandPalette from '../components/search/CommandPalette';
import { useProjects, useProjectDetail } from '../hooks/useProjects';
import { useCommandPalette } from '../hooks/useCommandPalette';

export default function Home() {
  const { projects, loading } = useProjects();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'project' | 'settings'>('dashboard');
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
    if (page === 'dashboard' || page === 'settings') {
      setCurrentPage(page);
      setSelectedProjectPath(null);
    }
  }, []);

  const handleSearchSelect = useCallback(
    (result: any) => {
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
      : selectedProject?.name || 'Project';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-0">
        <div className="text-text-tertiary text-sm">Loading projects...</div>
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
        currentPage={currentPage === 'project' ? 'dashboard' : currentPage}
        pageTitle={pageTitle}
        onOpenSearch={() => setOpen(true)}
      >
        {currentPage === 'dashboard' && (
          <Dashboard projects={projects} onSelectProject={handleSelectProject} />
        )}
        {currentPage === 'project' && selectedProject && (
          <ProjectDetail
            project={selectedProject}
            onBack={() => handleNavigate('dashboard')}
          />
        )}
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
