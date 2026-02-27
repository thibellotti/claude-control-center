import React, { useState } from 'react';
import type { Project } from '../../../shared/types';
import StatusBadge from '../shared/StatusBadge';
import Tabs from '../shared/Tabs';
import ProjectOverview from './ProjectOverview';
import TaskList from './TaskList';
import TeamView from './TeamView';
import SessionList from './SessionList';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 6l2 1.5L4 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function EditorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8.5 2.5l3 3M2 9.5l6.5-6.5 3 3L5 12.5H2v-3z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FinderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2.5" width="11" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 5.5h11" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function ClaudeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 5l2.5 2L4 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 9H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function shortenPath(path: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || '~';
  if (path.startsWith(home)) {
    return '~' + path.slice(home.length);
  }
  return path;
}

export default function ProjectDetail({ project, onBack }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'tasks',
      label: 'Tasks',
      count: project.tasks.filter((t) => t.status !== 'deleted').length,
    },
    { id: 'teams', label: 'Teams', count: project.teams.length },
    { id: 'sessions', label: 'Sessions' },
  ];

  return (
    <div className="p-6 max-w-[1000px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBack}
            className="p-1 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
            title="Back to dashboard"
          >
            <ChevronLeftIcon />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">{project.name}</h1>
          <StatusBadge status={project.status} />
        </div>

        <p className="text-xs font-mono text-text-tertiary ml-8">
          {shortenPath(project.path)}
        </p>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 ml-8 mt-3">
          <button
            onClick={() => window.api.launchClaude(project.path)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            <ClaudeIcon />
            Launch Claude
          </button>
          <button
            onClick={() => window.api.openInTerminal(project.path)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-surface-2 border border-border-subtle text-xs text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
          >
            <TerminalIcon />
            Terminal
          </button>
          <button
            onClick={() => window.api.openInEditor(project.path)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-surface-2 border border-border-subtle text-xs text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
          >
            <EditorIcon />
            Editor
          </button>
          <button
            onClick={() => window.api.openInFinder(project.path)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-surface-2 border border-border-subtle text-xs text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
          >
            <FinderIcon />
            Finder
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && <ProjectOverview project={project} />}
        {activeTab === 'tasks' && <TaskList tasks={project.tasks} />}
        {activeTab === 'teams' && <TeamView teams={project.teams} />}
        {activeTab === 'sessions' && <SessionList projectPath={project.path} />}
      </div>
    </div>
  );
}
