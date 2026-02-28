import React, { useState, useEffect } from 'react';
import type { CellConfigTaskBoard, Team } from '../../../../shared/types';
import TaskList from '../../project/TaskList';

interface TaskBoardCellProps {
  config: CellConfigTaskBoard;
}

export default function TaskBoardCell({ config }: TaskBoardCellProps) {
  const [tasks] = useState([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const teamConfigPath = `~/.claude/teams/${config.teamName}/config.json`;
        const teamRaw = await window.api.readFile(teamConfigPath);
        if (cancelled) return;

        if (teamRaw) {
          const teamData = JSON.parse(teamRaw) as Team;
          setTeam(teamData);
        }
      } catch {
        // Team may not exist yet
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [config.teamName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-text-tertiary">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-3">
      {team && (
        <div className="flex items-center gap-2 py-2 border-b border-border-subtle mb-2">
          <span className="text-xs font-medium text-text-primary">{team.name}</span>
          <span className="text-micro text-text-tertiary">
            {team.members.length} members
          </span>
        </div>
      )}
      <TaskList tasks={tasks} />
    </div>
  );
}
