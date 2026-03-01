import { useState, useCallback, useMemo, useRef } from 'react';
import type { Project } from '../../shared/types';
import type { CommandResult } from '../hooks/useCommandPalette';
import AppLayout from '../components/layout/AppLayout';
import Dashboard from '../components/dashboard/Dashboard';
import SettingsPage from '../components/settings/SettingsPage';
import PromptLibrary from '../components/prompts/PromptLibrary';
import WorkspaceBoard from '../components/workspace/WorkspaceBoard';
import CommandPalette from '../components/search/CommandPalette';
import UsageTracker from '../components/usage/UsageTracker';
import OnboardingWizard from '../components/dirigir/OnboardingWizard';
import dynamic from 'next/dynamic';

const OrchestratorPage = dynamic(() => import('../components/orchestrator/OrchestratorPage'), { ssr: false });
import { useProjects, useProjectDetail } from '../hooks/useProjects';
import { useCommandPalette } from '../hooks/useCommandPalette';
import { useToast } from '../hooks/useToast';
import { useActiveSessions } from '../hooks/useSessions';
import { ProjectProvider } from '../hooks/useProjectContext';
import { useOnboarding } from '../hooks/useOnboarding';

// ---------------------------------------------------------------------------
// Mode persistence helpers
// ---------------------------------------------------------------------------

const MODE_STORAGE_KEY = 'project-claude-mode';

function getSavedMode(projectPath: string): 'claude' | 'claude --dangerously-skip-permissions' {
  try {
    const saved = JSON.parse(localStorage.getItem(MODE_STORAGE_KEY) || '{}');
    return saved[projectPath] || 'claude';
  } catch {
    return 'claude';
  }
}

function saveMode(projectPath: string, mode: string): void {
  try {
    const saved = JSON.parse(localStorage.getItem(MODE_STORAGE_KEY) || '{}');
    saved[projectPath] = mode;
    localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // ignore
  }
}

export default function Home() {
  const { addToast } = useToast();
  const lastToastTime = useRef(0);
  const { completed: onboardingCompleted, isLoading: onboardingLoading, completeStep } = useOnboarding();

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
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'project' | 'settings' | 'prompts' | 'workspaces' | 'usage' | 'sessions'>('dashboard');
  const [selectedProjectPath, setSelectedProjectPath] = useState<string | null>(null);
  const { project: selectedProject } = useProjectDetail(
    currentPage === 'project' ? selectedProjectPath : null
  );

  const [launchProject, setLaunchProject] = useState<{ path: string; mode: string } | null>(null);

  const { open, setOpen, query, setQuery, results } = useCommandPalette(projects);

  // Clicking a project card opens Orchestrator with the saved (or default) mode
  const handleSelectProject = useCallback((project: Project) => {
    const mode = getSavedMode(project.path);
    saveMode(project.path, mode);
    setLaunchProject({ path: project.path, mode });
    setCurrentPage('sessions');
  }, []);

  // Explicit open with a chosen mode (from inline buttons or project switcher)
  const handleLaunchProject = useCallback((projectPath: string, mode: 'claude' | 'claude --dangerously-skip-permissions') => {
    saveMode(projectPath, mode);
    setLaunchProject({ path: projectPath, mode });
    setCurrentPage('sessions');
  }, []);

  const handleNavigate = useCallback((page: string) => {
    if (page === 'dashboard' || page === 'settings' || page === 'prompts' || page === 'workspaces' || page === 'usage' || page === 'sessions') {
      setCurrentPage(page);
      setSelectedProjectPath(null);
      if (page !== 'sessions') {
        setLaunchProject(null);
      }
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
      : currentPage === 'workspaces'
      ? 'Workspaces'
      : currentPage === 'usage'
      ? 'Usage & Costs'
      : currentPage === 'sessions'
      ? 'Orchestrator'
      : selectedProject?.name || 'Project';

  const contextValue = useMemo(
    () => ({
      projects,
      selectedProjectPath,
      onSelectProject: handleSelectProject,
      onOpenProject: handleLaunchProject,
      activeProjectPath: launchProject?.path || null,
      activeSessions: activeSessions || [],
      getSessionForProject: getSessionForProject || (() => null),
    }),
    [projects, selectedProjectPath, handleSelectProject, handleLaunchProject, launchProject, activeSessions, getSessionForProject]
  );

  if (loading || onboardingLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-0">
        <div className="flex items-center gap-2 text-text-tertiary text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse" />
          Loading projects...
        </div>
      </div>
    );
  }

  if (!onboardingCompleted) {
    return (
      <OnboardingWizard
        onComplete={() => completeStep('tourCompleted')}
        onStepComplete={completeStep}
      />
    );
  }

  return (
    <ProjectProvider value={contextValue}>
      <AppLayout
        selectedProject={currentPage === 'project' ? selectedProject : null}
        onNavigate={handleNavigate}
        onBack={() => handleNavigate('dashboard')}
        currentPage={currentPage === 'project' ? 'dashboard' : currentPage as string}
        pageTitle={pageTitle}
        onOpenSearch={() => setOpen(true)}
        activeProject={launchProject ? {
          name: launchProject.path.split('/').pop() || '',
          client: projects.find(p => p.path === launchProject.path)?.client || null,
          path: launchProject.path,
          mode: launchProject.mode,
        } : null}
        recentProjects={projects.slice(0, 10).map(p => ({ name: p.name, path: p.path, client: p.client }))}
        onSwitchProject={(path) => {
          const mode = getSavedMode(path);
          handleLaunchProject(path, mode);
        }}
      >
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'workspaces' && <WorkspaceBoard />}
        {currentPage === 'prompts' && <PromptLibrary />}
        {currentPage === 'usage' && <UsageTracker />}
        {currentPage === 'sessions' && (
          <OrchestratorPage
            initialProject={launchProject ? { path: launchProject.path, mode: launchProject.mode as 'claude' | 'claude --dangerously-skip-permissions' } : undefined}
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

    </ProjectProvider>
  );
}
