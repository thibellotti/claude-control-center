import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Project } from '../../shared/types';

export interface CommandResult {
  type: 'project' | 'task' | 'plan';
  title: string;
  subtitle: string;
  data: any;
}

const MAX_RESULTS = 10;

function searchProjects(projects: Project[], query: string): CommandResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: CommandResult[] = [];

  for (const project of projects) {
    if (results.length >= MAX_RESULTS) break;

    // Match project names
    if (project.name.toLowerCase().includes(q)) {
      results.push({
        type: 'project',
        title: project.name,
        subtitle: project.path,
        data: project,
      });
    }

    // Match task subjects
    for (const task of project.tasks) {
      if (results.length >= MAX_RESULTS) break;
      if (
        task.subject.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'task',
          title: task.subject,
          subtitle: `${project.name} - ${task.status}`,
          data: { ...task, project },
        });
      }
    }

    // Match plan content
    if (project.plan && project.plan.toLowerCase().includes(q)) {
      if (results.length < MAX_RESULTS) {
        // Extract a snippet around the match
        const idx = project.plan.toLowerCase().indexOf(q);
        const start = Math.max(0, idx - 30);
        const end = Math.min(project.plan.length, idx + q.length + 30);
        const snippet = (start > 0 ? '...' : '') +
          project.plan.slice(start, end).replace(/\n/g, ' ') +
          (end < project.plan.length ? '...' : '');

        results.push({
          type: 'plan',
          title: `Plan: ${project.name}`,
          subtitle: snippet,
          data: project,
        });
      }
    }
  }

  return results.slice(0, MAX_RESULTS);
}

export function useCommandPalette(projects: Project[]) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Keyboard shortcut: Cmd+K to toggle, Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) setQuery(''); // Clear query on open
          return !prev;
        });
      }

      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const results = useMemo(
    () => searchProjects(projects, query),
    [projects, query]
  );

  const handleSetOpen = useCallback((value: boolean) => {
    if (value) setQuery('');
    setOpen(value);
  }, []);

  return { open, setOpen: handleSetOpen, query, setQuery, results };
}
