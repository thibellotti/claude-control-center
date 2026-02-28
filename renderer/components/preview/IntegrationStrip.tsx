import React, { useMemo } from 'react';
import type { Project } from '../../../shared/types';
import { DatabaseIcon, VercelIcon, GitHubIcon } from '../icons';

type IntegrationId = 'supabase' | 'vercel' | 'github';

interface IntegrationStripProps {
  project: Project;
  activeOverlay: IntegrationId | null;
  onToggleOverlay: (id: IntegrationId) => void;
}

const INTEGRATION_MAP: Record<IntegrationId, { label: string; icon: React.ReactNode }> = {
  supabase: { label: 'Supabase', icon: <DatabaseIcon size={12} /> },
  vercel: { label: 'Vercel', icon: <VercelIcon size={12} /> },
  github: { label: 'GitHub', icon: <GitHubIcon size={12} /> },
};

export default function IntegrationStrip({ project, activeOverlay, onToggleOverlay }: IntegrationStripProps) {
  const integrations = useMemo(() => {
    const result: IntegrationId[] = [];
    const deps = project.packageJson?.dependencies || {};
    const devDeps = project.packageJson?.devDependencies || {};

    if ('@supabase/supabase-js' in deps || '@supabase/supabase-js' in devDeps) {
      result.push('supabase');
    }
    if (project.packageJson) {
      result.push('vercel');
    }
    if (project.git?.remoteUrl) {
      result.push('github');
    }
    return result;
  }, [project]);

  if (integrations.length === 0) return null;

  return (
    <div className="h-9 shrink-0 flex items-center gap-1.5 px-3 border-t border-border-subtle bg-surface-1">
      {integrations.map((id) => {
        const info = INTEGRATION_MAP[id];
        const isActive = activeOverlay === id;
        return (
          <button
            key={id}
            onClick={() => onToggleOverlay(id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              isActive
                ? 'bg-accent/10 text-accent'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2'
            }`}
          >
            {info.icon}
            {info.label}
          </button>
        );
      })}
    </div>
  );
}

export type { IntegrationId };
