import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Project } from '../../shared/types';
import type { CommandResult } from '../hooks/useCommandPalette';
import AppLayout from '../components/layout/AppLayout';
import Dashboard from '../components/dashboard/Dashboard';
import SettingsPage from '../components/settings/SettingsPage';
import PromptLibrary from '../components/prompts/PromptLibrary';
import CommandPalette from '../components/search/CommandPalette';
import ProjectDetail from '../components/project/ProjectDetail';
import ClientDetail from '../components/client/ClientDetail';
import ClaudeMdManager from '../components/claudemd/ClaudeMdManager';
import AgentLibrary from '../components/agents/AgentLibrary';
import dynamic from 'next/dynamic';

const OrchestratorPage = dynamic(() => import('../components/orchestrator/OrchestratorPage'), { ssr: false });
import { useProjects, useProjectDetail } from '../hooks/useProjects';
import { useCommandPalette } from '../hooks/useCommandPalette';
import { useToast } from '../hooks/useToast';
import { useActiveSessions } from '../hooks/useSessions';
import { useClients } from '../hooks/useClients';
import { ProjectProvider } from '../hooks/useProjectContext';

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
  const { clients } = useClients();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'project' | 'settings' | 'prompts' | 'sessions' | 'agents' | 'instructions' | 'analytics' | 'client'>('dashboard');
  const [selectedProjectPath, setSelectedProjectPath] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { project: selectedProject } = useProjectDetail(
    currentPage === 'project' ? selectedProjectPath : null
  );

  const [launchProject, setLaunchProject] = useState<{ path: string; mode: string } | null>(null);

  // Auto-seed client workspaces from project.client values on first load
  const seededRef = useRef(false);
  useEffect(() => {
    if (projects.length > 0 && !seededRef.current) {
      seededRef.current = true;
      window.api.seedClientsFromProjects(projects.map(p => ({ client: p.client })));
    }
  }, [projects]);

  const { open, setOpen, query, setQuery, results } = useCommandPalette(projects);

  // Clicking a project card opens the Project Detail page
  const handleSelectProject = useCallback((project: Project) => {
    setSelectedProjectPath(project.path);
    setCurrentPage('project');
  }, []);

  // Clicking a client card opens the Client Detail page
  const handleSelectClient = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentPage('client');
  }, []);

  // Explicit open with a chosen mode (from inline buttons or project switcher)
  const handleLaunchProject = useCallback((projectPath: string, mode: 'claude' | 'claude --dangerously-skip-permissions') => {
    saveMode(projectPath, mode);
    setLaunchProject({ path: projectPath, mode });
    setCurrentPage('sessions');
  }, []);

  const handleNavigate = useCallback((page: string) => {
    if (page === 'dashboard' || page === 'settings' || page === 'prompts' || page === 'sessions' || page === 'instructions' || page === 'agents' || page === 'analytics') {
      setCurrentPage(page);
      setSelectedProjectPath(null);
      setSelectedClientId(null);
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

  // Memoize derived project lists to avoid creating new array references on every render
  const recentProjects = useMemo(
    () => projects.slice(0, 10).map(p => ({ name: p.name, path: p.path, client: p.client })),
    [projects],
  );

  const claudeMdProjects = useMemo(
    () => projects.map(p => ({ path: p.path, name: p.name, client: p.client })),
    [projects],
  );

  const selectedClient = useMemo(
    () => (selectedClientId ? clients.find((c) => c.id === selectedClientId) : undefined),
    [selectedClientId, clients],
  );

  const pageTitle =
    currentPage === 'dashboard'
      ? 'Dashboard'
      : currentPage === 'settings'
      ? 'Settings'
      : currentPage === 'prompts'
      ? 'Prompt Library'
      : currentPage === 'sessions'
      ? 'Orchestrator'
      : currentPage === 'agents'
      ? 'Agents'
      : currentPage === 'analytics'
      ? 'Analytics'
      : currentPage === 'instructions'
      ? 'Instructions'
      : currentPage === 'client'
      ? selectedClient?.name || 'Client'
      : selectedProject?.name || 'Project';

  const contextValue = useMemo(
    () => ({
      projects,
      selectedProjectPath,
      onSelectProject: handleSelectProject,
      onOpenProject: handleLaunchProject,
      onSelectClient: handleSelectClient,
      activeProjectPath: launchProject?.path || null,
      activeSessions: activeSessions || [],
      getSessionForProject: getSessionForProject || (() => null),
    }),
    [projects, selectedProjectPath, handleSelectProject, handleLaunchProject, handleSelectClient, launchProject, activeSessions, getSessionForProject]
  );

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
    <ProjectProvider value={contextValue}>
      <AppLayout
        onNavigate={handleNavigate}
        onBack={() => handleNavigate('dashboard')}
        currentPage={currentPage as string}
        pageTitle={pageTitle}
        onOpenSearch={() => setOpen(true)}
        activeProject={launchProject ? {
          name: launchProject.path.split('/').pop() || '',
          client: projects.find(p => p.path === launchProject.path)?.client || null,
          path: launchProject.path,
          mode: launchProject.mode,
        } : null}
        recentProjects={recentProjects}
        onSwitchProject={(path) => {
          const mode = getSavedMode(path);
          handleLaunchProject(path, mode);
        }}
      >
        {currentPage === 'project' && selectedProject && (
          <ProjectDetail
            project={selectedProject}
            onOpenInClaude={(mode) => handleLaunchProject(selectedProject.path, mode)}
            onBack={() => handleNavigate('dashboard')}
          />
        )}
        {currentPage === 'client' && selectedClient && (
          <ClientDetail
            workspace={selectedClient}
            onBack={() => handleNavigate('dashboard')}
          />
        )}
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'prompts' && <PromptLibrary />}
        {currentPage === 'sessions' && (
          <OrchestratorPage
            initialProject={launchProject ? { path: launchProject.path, mode: launchProject.mode as 'claude' | 'claude --dangerously-skip-permissions' } : undefined}
          />
        )}
        {currentPage === 'instructions' && (
          <ClaudeMdManager
            projects={claudeMdProjects}
          />
        )}
        {currentPage === 'agents' && <AgentLibrary />}
        {currentPage === 'analytics' && (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <p className="text-sm">Select a client workspace to view analytics.</p>
            <p className="text-xs mt-1 opacity-60">Aggregated analytics across all clients coming soon.</p>
          </div>
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
