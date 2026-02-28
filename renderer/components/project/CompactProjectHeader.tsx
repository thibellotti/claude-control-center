import React from 'react';
import type { Project } from '../../../shared/types';
import StatusBadge from '../shared/StatusBadge';
import { ChevronLeftIcon, InfoIcon, ExternalLinkIcon } from '../icons';

interface CompactProjectHeaderProps {
  project: Project;
  onBack: () => void;
  onOpenDrawer: () => void;
}

function shortenPath(path: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || '~';
  if (path.startsWith(home)) {
    return '~' + path.slice(home.length);
  }
  return path;
}

export default function CompactProjectHeader({ project, onBack, onOpenDrawer }: CompactProjectHeaderProps) {
  return (
    <div className="h-12 shrink-0 flex items-center gap-2 px-3 border-b border-border-subtle bg-surface-0">
      {/* Back button */}
      <button
        onClick={onBack}
        className="p-1 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors shrink-0"
        title="Back to dashboard"
      >
        <ChevronLeftIcon size={16} />
      </button>

      {/* Project name + status */}
      <span className="text-sm font-semibold text-text-primary truncate">{project.name}</span>
      <span className="shrink-0"><StatusBadge status={project.status} /></span>

      {/* Path */}
      <span className="text-micro font-mono text-text-tertiary truncate hidden md:inline">
        {shortenPath(project.path)}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
      <button
        onClick={onOpenDrawer}
        className="p-1.5 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
        title="Project details"
      >
        <InfoIcon />
      </button>
      <button
        onClick={() => window.api.openInEditor(project.path)}
        className="p-1.5 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
        title="Open in editor"
      >
        <ExternalLinkIcon />
      </button>
    </div>
  );
}
