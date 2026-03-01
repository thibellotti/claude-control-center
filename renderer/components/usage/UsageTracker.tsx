import React, { useState, useMemo } from 'react';
import { useUsageTracker } from '../../hooks/useUsageTracker';
import UsageChart from './UsageChart';
import { RefreshIcon } from '../icons';

function formatCost(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function formatPercent(value: number): string {
  if (value >= 100) return `${Math.round(value)}%`;
  if (value >= 10) return `${value.toFixed(0)}%`;
  return `${value.toFixed(1)}%`;
}

const DATE_RANGES = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

// -- Stat card icon components (simple div-based shapes) --

function CostIcon() {
  return (
    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
      <span className="text-emerald-400 text-sm font-semibold">$</span>
    </div>
  );
}

function TokensIcon() {
  return (
    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
      <div className="flex gap-[2px]">
        <div className="w-[3px] h-3 bg-blue-400/80 rounded-full" />
        <div className="w-[3px] h-2 bg-blue-400/50 rounded-full mt-1" />
        <div className="w-[3px] h-3.5 bg-blue-400/80 rounded-full -mt-0.5" />
      </div>
    </div>
  );
}

function SessionsIcon() {
  return (
    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
      <div className="flex flex-col gap-[2px]">
        <div className="w-4 h-[2px] bg-purple-400/80 rounded-full" />
        <div className="w-3 h-[2px] bg-purple-400/50 rounded-full" />
        <div className="w-3.5 h-[2px] bg-purple-400/70 rounded-full" />
      </div>
    </div>
  );
}

function AvgIcon() {
  return (
    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
      <div className="w-3.5 h-3.5 border-[1.5px] border-amber-400/70 rounded-full flex items-center justify-center">
        <div className="w-[2px] h-[2px] bg-amber-400 rounded-full" />
      </div>
    </div>
  );
}

export default function UsageTracker() {
  const {
    summary,
    isLoading,
    dateRange,
    setDateRange,
    dailyData,
    projectBreakdown,
    refresh,
  } = useUsageTracker();

  const [chartMode, setChartMode] = useState<'cost' | 'tokens'>('cost');

  // Derived stats
  const avgCostPerSession =
    summary && summary.totalSessions > 0
      ? summary.totalCostUSD / summary.totalSessions
      : 0;

  const avgSessionsPerDay = useMemo(() => {
    if (!dailyData.length) return 0;
    const totalSessions = dailyData.reduce((sum, d) => sum + d.sessionCount, 0);
    return totalSessions / dailyData.length;
  }, [dailyData]);

  const avgTokensPerSession = useMemo(() => {
    if (!summary || summary.totalSessions === 0) return 0;
    return (summary.totalInputTokens + summary.totalOutputTokens) / summary.totalSessions;
  }, [summary]);

  // Cost trend: compare first half vs second half of the period
  const costTrend = useMemo(() => {
    if (dailyData.length < 2) return null;
    const mid = Math.floor(dailyData.length / 2);
    const firstHalf = dailyData.slice(0, mid);
    const secondHalf = dailyData.slice(mid);

    const firstTotal = firstHalf.reduce((s, d) => s + d.costUSD, 0);
    const secondTotal = secondHalf.reduce((s, d) => s + d.costUSD, 0);

    // Normalize by number of days in each half
    const firstAvg = firstTotal / firstHalf.length;
    const secondAvg = secondTotal / secondHalf.length;

    if (firstAvg === 0) return null;
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    return change;
  }, [dailyData]);

  // Total cost for percentage bars in project breakdown
  const totalCost = summary?.totalCostUSD ?? 0;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-text-tertiary text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse" />
            Loading usage data...
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !summary || summary.entries.length === 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Usage & Costs</h1>
          <p className="text-sm text-text-tertiary mt-0.5">
            Estimated API usage from Claude session data
          </p>
        </div>
        <button
          onClick={refresh}
          className="p-2 rounded-button text-text-tertiary hover:text-text-secondary hover:bg-surface-2 transition-colors"
          title="Refresh"
        >
          <RefreshIcon />
        </button>
      </div>

      {/* Date range pills */}
      <div className="flex items-center gap-2">
        {DATE_RANGES.map((range) => (
          <button
            key={range.value}
            onClick={() => setDateRange(range.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              dateRange === range.value
                ? 'bg-accent text-white'
                : 'bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {isEmpty ? (
        /* Empty state with div-based illustration */
        <div className="flex flex-col items-center justify-center py-24 bg-surface-1 rounded-lg border border-border-subtle">
          {/* Div-based chart illustration */}
          <div className="relative mb-6">
            {/* Background circle */}
            <div className="w-20 h-20 rounded-full bg-surface-2 flex items-end justify-center pb-4 gap-1.5">
              {/* Bars */}
              <div className="w-2.5 h-4 bg-surface-3 rounded-t" />
              <div className="w-2.5 h-7 bg-surface-3 rounded-t" />
              <div className="w-2.5 h-5 bg-surface-3 rounded-t" />
              <div className="w-2.5 h-9 bg-accent/20 rounded-t border border-dashed border-accent/30" />
            </div>
            {/* Decorative dots */}
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-surface-3" />
            <div className="absolute -bottom-1 -left-2 w-1.5 h-1.5 rounded-full bg-surface-3" />
          </div>
          <span className="text-text-secondary text-sm font-medium">No usage data found</span>
          <span className="text-text-tertiary text-xs mt-1.5 max-w-xs text-center leading-relaxed">
            Usage data is parsed from Claude session files in ~/.claude/projects/
          </span>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            {/* Total Cost */}
            <div className="bg-surface-1 rounded-lg border border-border-subtle p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="text-xs text-text-tertiary uppercase tracking-wider">Total Cost</div>
                <CostIcon />
              </div>
              <div className="text-xl font-semibold text-text-primary">
                {formatCost(summary.totalCostUSD)}
              </div>
              {costTrend !== null && (
                <div className="mt-1.5 flex items-center gap-1">
                  <span
                    className={`text-[10px] font-medium ${
                      costTrend > 0 ? 'text-red-400' : costTrend < 0 ? 'text-emerald-400' : 'text-text-tertiary'
                    }`}
                  >
                    {costTrend > 0 ? '+' : ''}
                    {costTrend.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-text-tertiary">vs prev period</span>
                </div>
              )}
            </div>

            {/* Total Tokens */}
            <div className="bg-surface-1 rounded-lg border border-border-subtle p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="text-xs text-text-tertiary uppercase tracking-wider">Total Tokens</div>
                <TokensIcon />
              </div>
              <div className="text-xl font-semibold text-text-primary">
                {formatTokens(summary.totalInputTokens + summary.totalOutputTokens)}
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-text-tertiary">
                <span>
                  In <span className="text-text-secondary">{formatTokens(summary.totalInputTokens)}</span>
                </span>
                <span className="text-border-subtle">/</span>
                <span>
                  Out <span className="text-text-secondary">{formatTokens(summary.totalOutputTokens)}</span>
                </span>
              </div>
            </div>

            {/* Sessions */}
            <div className="bg-surface-1 rounded-lg border border-border-subtle p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="text-xs text-text-tertiary uppercase tracking-wider">Sessions</div>
                <SessionsIcon />
              </div>
              <div className="text-xl font-semibold text-text-primary">
                {summary.totalSessions.toLocaleString()}
              </div>
              <div className="mt-1.5 text-[10px] text-text-tertiary">
                ~{avgSessionsPerDay.toFixed(1)} per day
              </div>
            </div>

            {/* Avg / Session */}
            <div className="bg-surface-1 rounded-lg border border-border-subtle p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="text-xs text-text-tertiary uppercase tracking-wider">Avg / Session</div>
                <AvgIcon />
              </div>
              <div className="text-xl font-semibold text-text-primary">
                {formatCost(avgCostPerSession)}
              </div>
              <div className="mt-1.5 text-[10px] text-text-tertiary">
                ~{formatTokens(avgTokensPerSession)} tokens
              </div>
            </div>
          </div>

          {/* Chart */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-text-secondary">Daily Usage</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setChartMode('cost')}
                  className={`px-2.5 py-1 text-xs rounded-button transition-colors ${
                    chartMode === 'cost'
                      ? 'bg-surface-3 text-text-primary'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  Cost
                </button>
                <button
                  onClick={() => setChartMode('tokens')}
                  className={`px-2.5 py-1 text-xs rounded-button transition-colors ${
                    chartMode === 'tokens'
                      ? 'bg-surface-3 text-text-primary'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  Tokens
                </button>
              </div>
            </div>
            <UsageChart data={dailyData} mode={chartMode} />
          </div>

          {/* Project breakdown table */}
          <div>
            <h2 className="text-sm font-medium text-text-secondary mb-3">Project Breakdown</h2>
            <div className="bg-surface-1 rounded-lg border border-border-subtle overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_60px_80px_100px_100px_90px] gap-4 px-4 py-2.5 border-b border-border-subtle text-xs font-medium text-text-tertiary uppercase tracking-wider">
                <span>Project</span>
                <span className="text-right">%</span>
                <span className="text-right">Sessions</span>
                <span className="text-right">Input</span>
                <span className="text-right">Output</span>
                <span className="text-right">Cost</span>
              </div>

              {/* Table rows */}
              {projectBreakdown.map((project, i) => {
                const costPercent = totalCost > 0 ? (project.costUSD / totalCost) * 100 : 0;
                return (
                  <div
                    key={project.projectPath}
                    className={`grid grid-cols-[1fr_60px_80px_100px_100px_90px] gap-4 px-4 py-2.5 text-sm ${
                      i % 2 === 0 ? 'bg-surface-1' : 'bg-surface-2/50'
                    }`}
                  >
                    {/* Project name with visual cost bar */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative flex-1 min-w-0">
                        <span className="text-text-primary truncate block relative z-10" title={project.projectPath}>
                          {project.projectName}
                        </span>
                        {/* Background cost bar */}
                        <div
                          className="absolute bottom-0 left-0 h-[2px] bg-accent/30 rounded-full"
                          style={{ width: `${Math.max(costPercent, 2)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-text-tertiary text-right text-xs tabular-nums self-center">
                      {formatPercent(costPercent)}
                    </span>
                    <span className="text-text-secondary text-right self-center">
                      {project.sessionCount.toLocaleString()}
                    </span>
                    <span className="text-text-secondary text-right self-center">
                      {formatTokens(project.inputTokens)}
                    </span>
                    <span className="text-text-secondary text-right self-center">
                      {formatTokens(project.outputTokens)}
                    </span>
                    <span className="text-text-primary text-right font-medium self-center">
                      {formatCost(project.costUSD)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
