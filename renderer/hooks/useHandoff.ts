import { useState, useCallback, useMemo } from 'react';
import type { HandoffPackage } from '../../shared/types';

export interface HandoffSections {
  overview: boolean;
  plan: boolean;
  git: boolean;
  tasks: boolean;
  fileTree: boolean;
  techStack: boolean;
  dependencies: boolean;
}

const DEFAULT_SECTIONS: HandoffSections = {
  overview: true,
  plan: true,
  git: true,
  tasks: true,
  fileTree: true,
  techStack: true,
  dependencies: true,
};

export function useHandoff(projectPath: string) {
  const [handoff, setHandoff] = useState<HandoffPackage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedPath, setExportedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<HandoffSections>(DEFAULT_SECTIONS);

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setExportedPath(null);
    try {
      const result = await window.api.generateHandoff(projectPath);
      setHandoff(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate handoff');
    } finally {
      setIsGenerating(false);
    }
  }, [projectPath]);

  const exportHandoff = useCallback(
    async (format: 'markdown' | 'json') => {
      setIsExporting(true);
      setError(null);
      setExportedPath(null);
      try {
        const result = await window.api.exportHandoff(projectPath, format);
        setExportedPath(result.filePath);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to export handoff');
      } finally {
        setIsExporting(false);
      }
    },
    [projectPath]
  );

  const toggleSection = useCallback((key: keyof HandoffSections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Build preview markdown based on toggled sections
  const preview = useMemo(() => {
    if (!handoff) return '';

    const date = new Date(handoff.generatedAt)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);
    const lines: string[] = [];

    lines.push(`# ${handoff.projectName} -- Handoff Document`);
    lines.push('');
    lines.push(`Generated: ${date}`);
    lines.push('');

    if (sections.overview) {
      lines.push('## Overview');
      lines.push('');
      lines.push(handoff.overview || 'No CLAUDE.md found.');
      lines.push('');
    }

    if (sections.plan) {
      lines.push('## Current Plan');
      lines.push('');
      lines.push(handoff.plan || 'No plan document found.');
      lines.push('');
    }

    if (sections.git) {
      lines.push('## Git Status');
      lines.push('');
      if (handoff.gitBranch) {
        lines.push(`- **Branch:** ${handoff.gitBranch}`);
        lines.push(`- **Status:** ${handoff.gitStatus}`);
      } else {
        lines.push('Not a git repository.');
      }
      lines.push('');

      if (handoff.recentCommits.length > 0) {
        lines.push('### Recent Commits');
        lines.push('');
        for (const c of handoff.recentCommits) {
          lines.push(`- \`${c.hash}\` ${c.message} (${c.date}, ${c.author})`);
        }
        lines.push('');
      }
    }

    if (sections.tasks) {
      lines.push('## Active Tasks');
      lines.push('');
      if (handoff.tasks.length > 0) {
        lines.push('| Task | Status | Owner |');
        lines.push('|------|--------|-------|');
        for (const t of handoff.tasks) {
          lines.push(`| ${t.subject} | ${t.status} | ${t.owner || '--'} |`);
        }
      } else {
        lines.push('No active tasks found.');
      }
      lines.push('');
    }

    if (sections.fileTree) {
      lines.push('## File Structure');
      lines.push('');
      lines.push('```');
      lines.push(handoff.fileTree || '(empty)');
      lines.push('```');
      lines.push('');
    }

    if (sections.techStack) {
      lines.push('## Tech Stack');
      lines.push('');
      if (handoff.techStack.length > 0) {
        for (const tech of handoff.techStack) {
          lines.push(`- ${tech}`);
        }
      } else {
        lines.push('No technologies detected.');
      }
      lines.push('');
    }

    if (sections.dependencies) {
      lines.push('## Dependencies');
      lines.push('');
      const depEntries = Object.entries(handoff.dependencies);
      if (depEntries.length > 0) {
        for (const [name, version] of depEntries) {
          lines.push(`- \`${name}\`: ${version}`);
        }
      } else {
        lines.push('No dependencies found.');
      }
      lines.push('');
    }

    return lines.join('\n');
  }, [handoff, sections]);

  return {
    handoff,
    isGenerating,
    isExporting,
    exportedPath,
    error,
    sections,
    preview,
    generate,
    exportHandoff,
    toggleSection,
  };
}
