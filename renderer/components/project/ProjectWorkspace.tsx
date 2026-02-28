import React, { useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { Project } from '../../../shared/types';
import CompactProjectHeader from './CompactProjectHeader';
import ProjectDetailDrawer from './ProjectDetailDrawer';
import ProjectInfoPanel from './ProjectInfoPanel';
import EmbeddedTerminal from './EmbeddedTerminal';

interface ProjectWorkspaceProps {
  project: Project;
  onBack: () => void;
}

export default function ProjectWorkspace({ project, onBack }: ProjectWorkspaceProps) {
  const [showDrawer, setShowDrawer] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <CompactProjectHeader
        project={project}
        onBack={onBack}
        onOpenDrawer={() => setShowDrawer(true)}
      />

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

      <ProjectDetailDrawer
        project={project}
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
      />
    </div>
  );
}
