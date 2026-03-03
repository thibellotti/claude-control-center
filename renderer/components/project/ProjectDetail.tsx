import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Project } from '../../../shared/types';
import Tabs from '../shared/Tabs';
import Modal from '../shared/Modal';
import ProjectOverviewContent from './ProjectOverviewContent';
import {
  ChevronLeftIcon,
  ClaudeIcon,
  ExternalLinkIcon,
  DownloadIcon,
  EditIcon,
} from '../icons';

// ---------------------------------------------------------------------------
// Lazy-loaded tab components
// ---------------------------------------------------------------------------

const ComponentGallery = dynamic(() => import('../gallery/ComponentGallery'), { ssr: false });
const SessionReplay = dynamic(() => import('../sessions/SessionReplay'), { ssr: false });

// Lazy-loaded modal content
const HandoffExport = dynamic(() => import('../handoff/HandoffExport'), { ssr: false });
const ClaudeMdEditor = dynamic(() => import('../editor/ClaudeMdEditor'), { ssr: false });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortenPath(fullPath: string): string {
  const home = fullPath.replace(/^\/Users\/[^/]+/, '~');
  return home;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'components', label: 'Components' },
  { id: 'sessions', label: 'Sessions' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectDetailProps {
  project: Project;
  onOpenInClaude: (mode: 'claude' | 'claude --dangerously-skip-permissions') => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// ProjectDetail
// ---------------------------------------------------------------------------

export default function ProjectDetail({ project, onOpenInClaude, onBack }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [claudeMdOpen, setClaudeMdOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="h-full overflow-y-auto bg-surface-0">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <header>
          {/* Back button */}
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-text-tertiary hover:text-text-secondary text-xs mb-4 transition-colors"
          >
            <ChevronLeftIcon size={12} />
            Dashboard
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-semibold text-text-primary truncate">
                  {project.name}
                </h1>
                {project.client && (
                  <span className="shrink-0 px-2 py-1 rounded-full bg-surface-3 text-xs font-medium text-text-secondary">
                    {project.client}
                  </span>
                )}
                <span
                  className={`shrink-0 w-2 h-2 rounded-full ${
                    project.status === 'active' ? 'bg-status-active' : 'bg-status-idle'
                  }`}
                  title={project.status}
                />
              </div>
              <p className="text-xs font-mono text-text-tertiary truncate">
                {shortenPath(project.path)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onOpenInClaude('claude')}
                className="flex items-center gap-1 px-3 py-1 rounded-button text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                <ClaudeIcon size={12} />
                Open in Claude
              </button>
              <button
                onClick={() => window.api.openInEditor(project.path)}
                className="flex items-center gap-1 px-2 py-1 rounded-button text-xs font-medium text-text-secondary bg-surface-2 border border-border-subtle hover:border-border-default transition-colors"
              >
                <ExternalLinkIcon size={12} />
                Editor
              </button>
              {/* More menu */}
              <div className="relative">
                <button
                  onClick={() => setMoreOpen(!moreOpen)}
                  className="flex items-center justify-center w-7 h-7 rounded-button text-text-secondary bg-surface-2 border border-border-subtle hover:border-border-default transition-colors"
                >
                  <span className="text-sm leading-none">...</span>
                </button>
                {moreOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-surface-1 border border-border-subtle rounded-card shadow-lg py-1">
                      <button
                        onClick={() => { onOpenInClaude('claude --dangerously-skip-permissions'); setMoreOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-surface-2 transition-colors"
                      >
                        Autopilot
                      </button>
                      <button
                        onClick={() => { window.api.openInFinder(project.path); setMoreOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-surface-2 transition-colors"
                      >
                        Open in Finder
                      </button>
                      <button
                        onClick={() => { setHandoffOpen(true); setMoreOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-surface-2 transition-colors"
                      >
                        <span className="flex items-center gap-2"><DownloadIcon size={12} /> Handoff</span>
                      </button>
                      <button
                        onClick={() => { setClaudeMdOpen(true); setMoreOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-surface-2 transition-colors"
                      >
                        <span className="flex items-center gap-2"><EditIcon size={12} /> Edit CLAUDE.md</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <Tabs tabs={PROJECT_TABS} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab content */}
        <div className="mt-6">
          {activeTab === 'overview' && <ProjectOverviewContent project={project} />}
          {activeTab === 'components' && <ComponentGallery projectPath={project.path} />}
          {activeTab === 'sessions' && <SessionReplay projectPath={project.path} />}
        </div>

        {/* Modals */}
        <Modal open={handoffOpen} onClose={() => setHandoffOpen(false)} title="Handoff Export">
          <HandoffExport projectPath={project.path} />
        </Modal>

        <Modal open={claudeMdOpen} onClose={() => setClaudeMdOpen(false)} title="Edit CLAUDE.md">
          <ClaudeMdEditor filePath={`${project.path}/CLAUDE.md`} onSave={() => setClaudeMdOpen(false)} />
        </Modal>
      </div>
    </div>
  );
}
