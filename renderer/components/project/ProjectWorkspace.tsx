import React, { useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { Project } from '../../../shared/types';
import CompactProjectHeader from './CompactProjectHeader';
import ProjectDetailDrawer from './ProjectDetailDrawer';
import ProjectInfoPanel from './ProjectInfoPanel';
import EmbeddedTerminal from './EmbeddedTerminal';
import SessionIntelDashboard from '../sessions/SessionIntelDashboard';

type WorkspaceTab = 'overview' | 'intelligence';

interface ProjectWorkspaceProps {
  project: Project;
  onBack: () => void;
}

export default function ProjectWorkspace({ project, onBack }: ProjectWorkspaceProps) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  return (
    <div className="flex flex-col h-full">
      <CompactProjectHeader
        project={project}
        onBack={onBack}
        onOpenDrawer={() => setShowDrawer(true)}
      />

      {/* Tab navigation */}
      <div className="flex items-center gap-0 px-3 border-b border-border-subtle bg-surface-0 shrink-0">
        {(['overview', 'intelligence'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-micro font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? 'text-text-primary border-accent'
                : 'text-text-tertiary border-transparent hover:text-text-secondary'
            }`}
          >
            {tab === 'overview' ? 'Overview' : 'Intelligence'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <Group orientation="vertical" className="flex-1">
          {/* Project info panel — scrollable overview */}
          <Panel defaultSize={40} minSize={15} collapsible>
            <ProjectInfoPanel project={project} />
          </Panel>

          <Separator className="h-1 bg-border-subtle hover:bg-accent/40 transition-colors cursor-row-resize" />

          {/* Terminal — Claude session */}
          <Panel defaultSize={60} minSize={20}>
            <EmbeddedTerminal projectPath={project.path} />
          </Panel>
        </Group>
      ) : (
        <div className="flex-1 overflow-hidden">
          <SessionIntelDashboard projectPath={project.path} />
        </div>
      )}

      <ProjectDetailDrawer
        project={project}
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
      />
    </div>
  );
}
