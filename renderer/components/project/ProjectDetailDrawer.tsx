import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { Project } from '../../../shared/types';
import Tabs from '../shared/Tabs';
import ProjectOverview from './ProjectOverview';
import TaskList from './TaskList';
import TeamView from './TeamView';
import SessionList from './SessionList';
import { CloseIcon } from '../icons';
import { useFocusTrap } from '../../hooks/useFocusTrap';

// Lazy load heavy drawer tabs
const SessionReplay = dynamic(() => import('../sessions/SessionReplay'));
const TokenStudio = dynamic(() => import('../tokens/TokenStudio'));
const ComponentGallery = dynamic(() => import('../gallery/ComponentGallery'));
const VisualDiff = dynamic(() => import('../diff/VisualDiff'));
const FigmaBridge = dynamic(() => import('../figma/FigmaBridge'));
const HandoffExport = dynamic(() => import('../handoff/HandoffExport'));

interface ProjectDetailDrawerProps {
  project: Project;
  open: boolean;
  onClose: () => void;
}

export default function ProjectDetailDrawer({ project, open, onClose }: ProjectDetailDrawerProps) {
  const trapRef = useFocusTrap(open);
  const [activeTab, setActiveTab] = useState('overview');
  const [hasTailwindConfig, setHasTailwindConfig] = useState(false);

  useEffect(() => {
    async function checkTailwindConfig() {
      const candidates = ['tailwind.config.js', 'tailwind.config.ts'];
      for (const name of candidates) {
        try {
          const result = await window.api.readFile(`${project.path}/${name}`);
          if (result !== null) {
            setHasTailwindConfig(true);
            return;
          }
        } catch {
          // File doesn't exist
        }
      }
      setHasTailwindConfig(false);
    }
    if (open) checkTailwindConfig();
  }, [project.path, open]);

  const hasReact = (() => {
    const deps = project.packageJson?.dependencies;
    const devDeps = project.packageJson?.devDependencies;
    return !!(deps?.react || devDeps?.react);
  })();

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: 'Tasks', count: project.tasks.filter((t) => t.status !== 'deleted').length },
    { id: 'teams', label: 'Teams', count: project.teams.length },
    { id: 'sessions', label: 'Sessions' },
    { id: 'replay', label: 'Replay' },
    { id: 'diff', label: 'Diff' },
    { id: 'design', label: 'Design' },
    ...(hasReact ? [{ id: 'components', label: 'Components' }] : []),
    ...(hasTailwindConfig ? [{ id: 'tokens', label: 'Tokens' }] : []),
    { id: 'handoff', label: 'Handoff' },
  ];

  if (!open) return null;

  return (
    <div ref={trapRef}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 bottom-0 w-[520px] max-w-[90vw] bg-surface-0 z-50 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
          <h2 className="text-sm font-semibold text-text-primary truncate">{project.name}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-2 shrink-0">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'overview' && <ProjectOverview project={project} />}
          {activeTab === 'tasks' && <TaskList tasks={project.tasks} />}
          {activeTab === 'teams' && <TeamView teams={project.teams} />}
          {activeTab === 'sessions' && <SessionList projectPath={project.path} />}
          {activeTab === 'replay' && <SessionReplay projectPath={project.path} />}
          {activeTab === 'diff' && <VisualDiff projectId={project.id} projectPath={project.path} />}
          {activeTab === 'design' && <FigmaBridge projectId={project.id} />}
          {activeTab === 'components' && <ComponentGallery projectPath={project.path} />}
          {activeTab === 'tokens' && <TokenStudio projectPath={project.path} />}
          {activeTab === 'handoff' && <HandoffExport projectPath={project.path} />}
        </div>
      </div>
    </div>
  );
}
