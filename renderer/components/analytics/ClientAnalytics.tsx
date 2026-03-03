import React, { useEffect, useCallback } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import type { ProjectUsage } from '../../hooks/useAnalytics';
import { DownloadIcon } from '../icons';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClientAnalyticsProps {
  clientName: string;
  projects: { path: string; name: string; client?: string | null }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function formatCost(n: number): string {
  return '$' + n.toFixed(2);
}

const DATE_RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientAnalytics({ clientName, projects }: ClientAnalyticsProps) {
  const { data, loading, dateRange, setDateRange, fetch } = useAnalytics();

  // Fetch on mount and when date range changes
  useEffect(() => {
    if (projects.length > 0) {
      fetch(projects, dateRange);
    }
  }, [projects, dateRange, fetch]);

  // Find the current client's data from the aggregated result
  const clientData = data.find((c) => c.clientName === clientName);
  const clientProjects: ProjectUsage[] = clientData?.projects || [];
  const totalCost = clientData?.totalCostUSD || 0;
  const totalInput = clientData?.totalInputTokens || 0;
  const totalOutput = clientData?.totalOutputTokens || 0;
  const totalSessions = clientData?.totalSessions || 0;
  const avgCostPerSession = totalSessions > 0 ? totalCost / totalSessions : 0;

  // CSV export
  const handleExportCSV = useCallback(() => {
    const header = 'Project,Sessions,InputTokens,OutputTokens,CostUSD';
    const rows = clientProjects.map(
      (p) =>
        `"${p.projectName}",${p.sessionCount},${p.totalInputTokens},${p.totalOutputTokens},${p.totalCostUSD.toFixed(2)}`,
    );
    // Add total row
    rows.push(
      `"TOTAL",${totalSessions},${totalInput},${totalOutput},${totalCost.toFixed(2)}`,
    );

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${clientName}-analytics.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [clientProjects, clientName, totalSessions, totalInput, totalOutput, totalCost]);

  // Handle date range change
  const handleDateRange = useCallback(
    (days: number) => {
      setDateRange(days);
    },
    [setDateRange],
  );

  if (loading && data.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-block w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-text-tertiary text-sm">Loading analytics...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-text-tertiary text-sm">No projects assigned to this client.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date range pills + Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {DATE_RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => handleDateRange(r.days)}
              className={`px-3 py-1 rounded-button text-xs font-medium transition-colors ${
                dateRange === r.days
                  ? 'bg-accent text-white'
                  : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleExportCSV}
          disabled={clientProjects.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-surface-1 border border-border-subtle text-text-secondary text-xs font-medium hover:bg-surface-2 transition-colors disabled:opacity-50"
        >
          <DownloadIcon size={12} />
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard label="Total Cost" value={formatCost(totalCost)} />
        <SummaryCard
          label="Total Tokens"
          value={formatTokens(totalInput + totalOutput)}
        />
        <SummaryCard label="Sessions" value={totalSessions.toString()} />
        <SummaryCard label="Avg Cost/Session" value={formatCost(avgCostPerSession)} />
      </div>

      {/* Project breakdown table */}
      {clientProjects.length > 0 && (
        <div className="bg-surface-1 border border-border-subtle rounded-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-4 py-2.5 text-text-tertiary font-medium">Project</th>
                <th className="text-right px-4 py-2.5 text-text-tertiary font-medium">Sessions</th>
                <th className="text-right px-4 py-2.5 text-text-tertiary font-medium">Input Tokens</th>
                <th className="text-right px-4 py-2.5 text-text-tertiary font-medium">Output Tokens</th>
                <th className="text-right px-4 py-2.5 text-text-tertiary font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {clientProjects.map((p) => (
                <tr key={p.projectPath} className="border-b border-border-subtle last:border-b-0 hover:bg-surface-2/50 transition-colors">
                  <td className="px-4 py-2.5 text-text-primary font-medium">{p.projectName}</td>
                  <td className="px-4 py-2.5 text-text-secondary font-mono text-right">{p.sessionCount}</td>
                  <td className="px-4 py-2.5 text-text-secondary font-mono text-right">{formatTokens(p.totalInputTokens)}</td>
                  <td className="px-4 py-2.5 text-text-secondary font-mono text-right">{formatTokens(p.totalOutputTokens)}</td>
                  <td className="px-4 py-2.5 text-text-primary font-mono text-right">{formatCost(p.totalCostUSD)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-default bg-surface-2/30">
                <td className="px-4 py-2.5 text-text-primary font-semibold">Total</td>
                <td className="px-4 py-2.5 text-text-primary font-mono font-semibold text-right">{totalSessions}</td>
                <td className="px-4 py-2.5 text-text-primary font-mono font-semibold text-right">{formatTokens(totalInput)}</td>
                <td className="px-4 py-2.5 text-text-primary font-mono font-semibold text-right">{formatTokens(totalOutput)}</td>
                <td className="px-4 py-2.5 text-text-primary font-mono font-semibold text-right">{formatCost(totalCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Loading indicator for refresh */}
      {loading && data.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-text-tertiary text-xs">
          <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
          Refreshing...
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Card sub-component
// ---------------------------------------------------------------------------

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-1 border border-border-subtle rounded-card px-4 py-3">
      <p className="text-text-tertiary text-xs mb-1">{label}</p>
      <p className="text-text-primary text-lg font-semibold font-mono">{value}</p>
    </div>
  );
}
