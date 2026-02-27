import React, { useState } from 'react';
import { useUsageTracker } from '../../hooks/useUsageTracker';
import UsageChart from './UsageChart';

function formatCost(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1.5 7a5.5 5.5 0 019.37-3.9M12.5 7a5.5 5.5 0 01-9.37 3.9"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path d="M10.5 1v2.5H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 13v-2.5H1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const DATE_RANGES = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

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

  const avgCostPerSession =
    summary && summary.totalSessions > 0
      ? summary.totalCostUSD / summary.totalSessions
      : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-text-tertiary text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse" />
          Loading usage data...
        </div>
      </div>
    );
  }

  const isEmpty = !summary || summary.entries.length === 0;

  return (
    <div className="space-y-6">
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
        <div className="flex flex-col items-center justify-center py-24 bg-surface-1 rounded-lg border border-border-subtle">
          <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="12" width="3" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.3" className="text-text-tertiary" />
              <rect x="7" y="8" width="3" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.3" className="text-text-tertiary" />
              <rect x="12" y="5" width="3" height="13" rx="0.5" stroke="currentColor" strokeWidth="1.3" className="text-text-tertiary" />
            </svg>
          </div>
          <span className="text-text-secondary text-sm font-medium">No usage data found</span>
          <span className="text-text-tertiary text-xs mt-1">
            Usage data is parsed from Claude session files in ~/.claude/projects/
          </span>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-surface-1 rounded-lg border border-border-subtle p-4">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Total Cost</div>
              <div className="text-xl font-semibold text-text-primary">{formatCost(summary.totalCostUSD)}</div>
            </div>
            <div className="bg-surface-1 rounded-lg border border-border-subtle p-4">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Total Tokens</div>
              <div className="text-xl font-semibold text-text-primary">
                {formatTokens(summary.totalInputTokens + summary.totalOutputTokens)}
              </div>
            </div>
            <div className="bg-surface-1 rounded-lg border border-border-subtle p-4">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Sessions</div>
              <div className="text-xl font-semibold text-text-primary">
                {summary.totalSessions.toLocaleString()}
              </div>
            </div>
            <div className="bg-surface-1 rounded-lg border border-border-subtle p-4">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Avg / Session</div>
              <div className="text-xl font-semibold text-text-primary">{formatCost(avgCostPerSession)}</div>
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
              <div className="grid grid-cols-[1fr_80px_100px_100px_90px] gap-4 px-4 py-2.5 border-b border-border-subtle text-xs font-medium text-text-tertiary uppercase tracking-wider">
                <span>Project</span>
                <span className="text-right">Sessions</span>
                <span className="text-right">Input</span>
                <span className="text-right">Output</span>
                <span className="text-right">Cost</span>
              </div>

              {/* Table rows */}
              {projectBreakdown.map((project, i) => (
                <div
                  key={project.projectPath}
                  className={`grid grid-cols-[1fr_80px_100px_100px_90px] gap-4 px-4 py-2.5 text-sm ${
                    i % 2 === 0 ? 'bg-surface-1' : 'bg-surface-2/50'
                  }`}
                >
                  <span className="text-text-primary truncate" title={project.projectPath}>
                    {project.projectName}
                  </span>
                  <span className="text-text-secondary text-right">
                    {project.sessionCount.toLocaleString()}
                  </span>
                  <span className="text-text-secondary text-right">
                    {formatTokens(project.inputTokens)}
                  </span>
                  <span className="text-text-secondary text-right">
                    {formatTokens(project.outputTokens)}
                  </span>
                  <span className="text-text-primary text-right font-medium">
                    {formatCost(project.costUSD)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
