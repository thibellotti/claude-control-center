import React, { useState, useMemo } from 'react';
import { useSessionIntel } from '../../hooks/useSessionIntel';
import type { SessionMetrics, FileHeatmapEntry } from '../../../shared/session-intel-types';

interface SessionIntelDashboardProps {
  projectPath: string;
}

// -- Stat Card --

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface-1 border border-border-subtle rounded-lg p-4">
      <div className="text-micro text-text-tertiary uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl font-semibold text-text-primary">{value}</div>
      {sub && <div className="text-micro text-text-tertiary mt-0.5">{sub}</div>}
    </div>
  );
}

// -- Activity Graph (GitHub-style) --

function ActivityGraph({
  dailyActivity,
}: {
  dailyActivity: Array<{ date: string; sessionCount: number; costUSD: number; filesChanged: number }>;
}) {
  const { cells, monthLabels, maxCount } = useMemo(() => {
    // Build a map of date -> sessionCount
    const dateMap = new Map<string, number>();
    let max = 0;
    for (const d of dailyActivity) {
      dateMap.set(d.date, d.sessionCount);
      if (d.sessionCount > max) max = d.sessionCount;
    }

    // Generate last 365 days
    const today = new Date();
    const days: Array<{ date: string; count: number; col: number; row: number }> = [];
    const months: Array<{ label: string; col: number }> = [];
    const seenMonths = new Set<string>();

    // Start from the Sunday of 52 weeks ago
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 363 - startDate.getDay());

    for (let i = 0; i < 371; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      if (d > today) break;

      const dateStr = d.toISOString().slice(0, 10);
      const dayOfWeek = d.getDay(); // 0=Sun
      const weekIndex = Math.floor(i / 7);

      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!seenMonths.has(monthKey) && dayOfWeek === 0) {
        seenMonths.add(monthKey);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        months.push({ label: monthNames[d.getMonth()], col: weekIndex });
      }

      days.push({
        date: dateStr,
        count: dateMap.get(dateStr) || 0,
        col: weekIndex,
        row: dayOfWeek,
      });
    }

    return { cells: days, monthLabels: months, maxCount: max };
  }, [dailyActivity]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-surface-2';
    if (maxCount <= 1) return 'bg-emerald-500';
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 'bg-emerald-900';
    if (ratio <= 0.5) return 'bg-emerald-700';
    if (ratio <= 0.75) return 'bg-emerald-500';
    return 'bg-emerald-400';
  };

  const totalCols = Math.max(...cells.map((c) => c.col)) + 1;

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-lg p-4">
      <div className="text-sm font-medium text-text-primary mb-3">Activity</div>

      {/* Month labels */}
      <div className="flex mb-1 ml-8">
        {monthLabels.map((m, i) => (
          <div
            key={i}
            className="text-micro text-text-tertiary absolute"
            style={{ left: `${(m.col / totalCols) * 100}%` }}
          >
            {m.label}
          </div>
        ))}
      </div>

      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] text-micro text-text-tertiary shrink-0 w-6">
          <div className="h-[11px]" /> {/* Sun */}
          <div className="h-[11px] leading-[11px]">Mon</div>
          <div className="h-[11px]" /> {/* Tue */}
          <div className="h-[11px] leading-[11px]">Wed</div>
          <div className="h-[11px]" /> {/* Thu */}
          <div className="h-[11px] leading-[11px]">Fri</div>
          <div className="h-[11px]" /> {/* Sat */}
        </div>

        {/* Grid */}
        <div
          className="grid gap-[3px] flex-1"
          style={{
            gridTemplateColumns: `repeat(${totalCols}, 11px)`,
            gridTemplateRows: 'repeat(7, 11px)',
          }}
        >
          {cells.map((cell, i) => (
            <div
              key={i}
              className={`rounded-sm ${getColor(cell.count)}`}
              style={{ gridColumn: cell.col + 1, gridRow: cell.row + 1 }}
              title={`${cell.date}: ${cell.count} session${cell.count !== 1 ? 's' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// -- File Heatmap --

function FileHeatmap({ entries }: { entries: FileHeatmapEntry[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? entries : entries.slice(0, 50);
  const maxTouch = entries.length > 0 ? entries[0].touchCount : 1;

  const getRowColor = (touchCount: number) => {
    const ratio = touchCount / maxTouch;
    if (ratio >= 0.75) return 'bg-orange-500/10';
    if (ratio >= 0.5) return 'bg-amber-500/8';
    if (ratio >= 0.25) return 'bg-yellow-500/5';
    return '';
  };

  const shortenPath = (p: string) => {
    // Show last 3 segments
    const parts = p.split('/');
    if (parts.length <= 3) return p;
    return '.../' + parts.slice(-3).join('/');
  };

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-lg p-4">
      <div className="text-sm font-medium text-text-primary mb-3">File Heatmap</div>

      {entries.length === 0 ? (
        <div className="text-micro text-text-tertiary">No files tracked yet</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-micro">
              <thead>
                <tr className="text-text-tertiary text-left border-b border-border-subtle">
                  <th className="pb-2 pr-4 font-medium">File Path</th>
                  <th className="pb-2 pr-4 font-medium text-right w-20">Touches</th>
                  <th className="pb-2 pr-4 font-medium text-right w-16">Edits</th>
                  <th className="pb-2 font-medium text-right w-24">Last Touched</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => (
                  <tr
                    key={entry.filePath}
                    className={`border-b border-border-subtle/50 ${getRowColor(entry.touchCount)}`}
                  >
                    <td className="py-1.5 pr-4 text-text-secondary font-mono truncate max-w-[300px]" title={entry.filePath}>
                      {shortenPath(entry.filePath)}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-text-primary font-medium">
                      {entry.touchCount}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-text-secondary">
                      {entry.editCount}
                    </td>
                    <td className="py-1.5 text-right text-text-tertiary">
                      {entry.lastTouched > 0
                        ? new Date(entry.lastTouched).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {entries.length > 50 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-2 text-micro text-accent hover:text-accent/80 transition-colors"
            >
              Show {entries.length - 50} more files
            </button>
          )}
        </>
      )}
    </div>
  );
}

// -- Tool Usage Bar Chart --

function ToolUsageChart({ toolCounts }: { toolCounts: Record<string, number> }) {
  const sorted = useMemo(() => {
    // Aggregate tool counts across all sessions
    const entries = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    return { entries, total };
  }, [toolCounts]);

  if (sorted.entries.length === 0) {
    return null;
  }

  const toolColors: Record<string, string> = {
    Read: 'bg-blue-500',
    Edit: 'bg-emerald-500',
    Write: 'bg-green-500',
    Bash: 'bg-amber-500',
    Grep: 'bg-purple-500',
    Glob: 'bg-pink-500',
    WebSearch: 'bg-cyan-500',
    WebFetch: 'bg-teal-500',
  };

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-lg p-4">
      <div className="text-sm font-medium text-text-primary mb-3">Tool Usage</div>
      <div className="space-y-2">
        {sorted.entries.map(([tool, count]) => {
          const pct = sorted.total > 0 ? (count / sorted.total) * 100 : 0;
          const color = toolColors[tool] || 'bg-zinc-500';
          return (
            <div key={tool} className="flex items-center gap-2">
              <div className="w-16 text-micro text-text-secondary truncate shrink-0" title={tool}>
                {tool}
              </div>
              <div className="flex-1 h-5 bg-surface-2 rounded overflow-hidden">
                <div
                  className={`h-full ${color} rounded transition-all`}
                  style={{ width: `${Math.max(pct, 1)}%` }}
                />
              </div>
              <div className="w-12 text-micro text-text-tertiary text-right shrink-0">{count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- Session List --

function SessionList({
  sessions,
  selectedSessionId: _selectedSessionId,
  onSelect,
}: {
  sessions: SessionMetrics[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDuration = (ms: number) => {
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
    return `${(ms / 3_600_000).toFixed(1)}h`;
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(2)}`;
  };

  const toggle = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      onSelect(id);
    }
  };

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-lg p-4">
      <div className="text-sm font-medium text-text-primary mb-3">
        Sessions ({sessions.length})
      </div>

      {sessions.length === 0 ? (
        <div className="text-micro text-text-tertiary">No sessions found</div>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {sessions.map((session) => {
            const isExpanded = expandedId === session.sessionId;
            return (
              <div key={session.sessionId}>
                <button
                  onClick={() => toggle(session.sessionId)}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    isExpanded ? 'bg-surface-2' : 'hover:bg-surface-2/50'
                  }`}
                >
                  <div className="flex items-center gap-3 text-micro">
                    <span className="text-text-tertiary w-20 shrink-0">
                      {session.startTime > 0
                        ? new Date(session.startTime).toLocaleDateString()
                        : '-'}
                    </span>
                    <span className="text-text-secondary w-12 shrink-0">
                      {formatDuration(session.durationMs)}
                    </span>
                    <span className="text-text-secondary w-14 shrink-0">
                      {formatCost(session.estimatedCostUSD)}
                    </span>
                    <span className="text-text-tertiary truncate flex-1 font-mono">
                      {session.model}
                    </span>
                    <span className="text-text-tertiary w-14 text-right shrink-0">
                      {session.filesTouched.length} files
                    </span>
                    <svg
                      className={`w-3 h-3 text-text-tertiary transition-transform shrink-0 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 4.5l3 3 3-3" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 py-2 ml-3 border-l border-border-subtle space-y-2">
                    {/* Token info */}
                    <div className="text-micro text-text-tertiary">
                      Input: {session.totalInputTokens.toLocaleString()} tokens | Output:{' '}
                      {session.totalOutputTokens.toLocaleString()} tokens
                    </div>

                    {/* Tool counts */}
                    {Object.keys(session.toolCounts).length > 0 && (
                      <div>
                        <div className="text-micro text-text-tertiary mb-1">Tools:</div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(session.toolCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([tool, count]) => (
                              <span
                                key={tool}
                                className="px-1.5 py-0.5 bg-surface-2 rounded text-micro text-text-secondary"
                              >
                                {tool}: {count}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Files */}
                    {session.filesTouched.length > 0 && (
                      <div>
                        <div className="text-micro text-text-tertiary mb-1">Files touched:</div>
                        <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
                          {session.filesTouched.slice(0, 20).map((fp) => (
                            <div key={fp} className="text-micro text-text-secondary font-mono truncate" title={fp}>
                              {fp.split('/').slice(-2).join('/')}
                            </div>
                          ))}
                          {session.filesTouched.length > 20 && (
                            <div className="text-micro text-text-tertiary">
                              +{session.filesTouched.length - 20} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Commands */}
                    {session.commandsRun.length > 0 && (
                      <div>
                        <div className="text-micro text-text-tertiary mb-1">Commands:</div>
                        <div className="space-y-0.5 max-h-[80px] overflow-y-auto">
                          {session.commandsRun.slice(0, 10).map((cmd, i) => (
                            <div key={i} className="text-micro text-text-secondary font-mono truncate" title={cmd}>
                              $ {cmd}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -- Main Dashboard --

export default function SessionIntelDashboard({ projectPath }: SessionIntelDashboardProps) {
  const { summary, selectedSession, isLoading, error, refresh, selectSession } =
    useSessionIntel(projectPath);

  // Aggregate tool counts across all sessions
  const aggregatedToolCounts = useMemo(() => {
    if (!summary) return {};
    const counts: Record<string, number> = {};
    for (const session of summary.sessions) {
      for (const [tool, count] of Object.entries(session.toolCounts)) {
        counts[tool] = (counts[tool] || 0) + count;
      }
    }
    return counts;
  }, [summary]);

  const formatDuration = (ms: number) => {
    const hours = ms / 3_600_000;
    if (hours < 1) return `${Math.round(ms / 60_000)}m`;
    return `${hours.toFixed(1)}h`;
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-text-tertiary">Analyzing sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <div className="text-sm text-red-400">{error}</div>
        <button
          onClick={refresh}
          className="text-micro text-accent hover:text-accent/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary || summary.totalSessions === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-text-tertiary">No session data found for this project</div>
      </div>
    );
  }

  const totalFilesChanged = new Set(
    summary.sessions.flatMap((s) => [...s.filesEdited, ...s.filesCreated])
  ).size;

  return (
    <div className="space-y-4 p-4 overflow-y-auto h-full">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Sessions"
          value={String(summary.totalSessions)}
        />
        <StatCard
          label="Total Cost"
          value={formatCost(summary.totalCostUSD)}
        />
        <StatCard
          label="Total Duration"
          value={formatDuration(summary.totalDurationMs)}
        />
        <StatCard
          label="Files Changed"
          value={String(totalFilesChanged)}
        />
      </div>

      {/* Activity graph */}
      <ActivityGraph dailyActivity={summary.dailyActivity} />

      {/* Tool usage + file heatmap side by side on wide screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ToolUsageChart toolCounts={aggregatedToolCounts} />
        <FileHeatmap entries={summary.fileHeatmap} />
      </div>

      {/* Session list */}
      <SessionList
        sessions={summary.sessions}
        selectedSessionId={selectedSession?.sessionId ?? null}
        onSelect={selectSession}
      />
    </div>
  );
}
