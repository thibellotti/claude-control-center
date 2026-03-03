import React from 'react';
import { useProjectIntel } from '../../hooks/useProjectIntel';
import type { ProjectHealthScore, ProjectCostSummary, DependencyAuditResult } from '../../../shared/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectIntelPanelProps {
  projectPath: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#eab308';
  return '#ef4444';
}

function scoreBgClass(score: number): string {
  if (score >= 70) return 'text-[#22c55e]';
  if (score >= 40) return 'text-[#eab308]';
  return 'text-[#ef4444]';
}

function formatCost(n: number): string {
  return '$' + n.toFixed(2);
}

function trendArrow(trend: ProjectCostSummary['trend']): { symbol: string; color: string } {
  switch (trend) {
    case 'increasing': return { symbol: '\u2191', color: 'text-[#ef4444]' };
    case 'decreasing': return { symbol: '\u2193', color: 'text-[#22c55e]' };
    default: return { symbol: '\u2192', color: 'text-text-tertiary' };
  }
}

function severityBadgeClass(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-[#ef4444]/15 text-[#ef4444]';
    case 'high': return 'bg-[#f97316]/15 text-[#f97316]';
    case 'moderate': return 'bg-[#eab308]/15 text-[#eab308]';
    case 'low': return 'bg-[#3b82f6]/15 text-[#3b82f6]';
    default: return 'bg-surface-3 text-text-tertiary';
  }
}

// ---------------------------------------------------------------------------
// Health Ring (SVG)
// ---------------------------------------------------------------------------

function HealthRing({ score }: { score: ProjectHealthScore }) {
  const radius = 40;
  const stroke = 6;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = (score.overall / 100) * circumference;
  const color = scoreColor(score.overall);

  const categories: { label: string; value: number; max: number }[] = [
    { label: 'Git', value: score.breakdown.gitCleanliness, max: 25 },
    { label: 'Activity', value: score.breakdown.activityRecency, max: 25 },
    { label: 'Deps', value: score.breakdown.dependencyHealth, max: 25 },
    { label: 'Config', value: score.breakdown.configQuality, max: 25 },
  ];

  return (
    <div className="flex items-start gap-6">
      {/* Ring */}
      <div className="relative shrink-0">
        <svg width={radius * 2} height={radius * 2}>
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="currentColor"
            className="text-surface-3"
            strokeWidth={stroke}
          />
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference - progress}`}
            strokeDashoffset={circumference * 0.25}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${scoreBgClass(score.overall)}`}>
            {score.overall}
          </span>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="flex-1 space-y-2 min-w-0">
        {categories.map((cat) => (
          <div key={cat.label}>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-text-tertiary">{cat.label}</span>
              <span className="text-text-secondary font-mono">{cat.value}/{cat.max}</span>
            </div>
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(cat.value / cat.max) * 100}%`,
                  backgroundColor: scoreColor((cat.value / cat.max) * 100),
                }}
              />
            </div>
          </div>
        ))}

        {/* Details */}
        {score.details.length > 0 && (
          <div className="pt-1 space-y-0.5">
            {score.details.map((detail, i) => (
              <p key={i} className="text-xs text-text-tertiary">
                {detail}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cost Cards
// ---------------------------------------------------------------------------

function CostCards({ cost }: { cost: ProjectCostSummary }) {
  const trend = trendArrow(cost.trend);
  const cards = [
    { label: 'Last 7 Days', value: cost.last7Days },
    { label: 'Last 30 Days', value: cost.last30Days },
    { label: 'All Time', value: cost.allTime },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map((card) => (
        <div key={card.label} className="bg-surface-1 border border-border-subtle rounded-card px-3 py-2">
          <p className="text-text-tertiary text-xs mb-1">{card.label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-text-primary text-sm font-semibold font-mono">
              {formatCost(card.value)}
            </span>
            {card.label === 'Last 7 Days' && (
              <span className={`text-xs ${trend.color}`}>{trend.symbol}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dependency Audit
// ---------------------------------------------------------------------------

function DependencyAuditSection({
  audit,
  isAuditing,
  onRunAudit,
}: {
  audit: DependencyAuditResult | null;
  isAuditing: boolean;
  onRunAudit: () => void;
}) {
  if (!audit) {
    return (
      <div className="flex items-center justify-between bg-surface-1 border border-border-subtle rounded-card px-4 py-3">
        <p className="text-xs text-text-tertiary">No audit data available</p>
        <button
          onClick={onRunAudit}
          disabled={isAuditing}
          className="px-3 py-1 rounded-button text-xs font-medium bg-surface-2 text-text-secondary hover:bg-surface-3 transition-colors disabled:opacity-50"
        >
          {isAuditing ? 'Auditing...' : 'Run Audit'}
        </button>
      </div>
    );
  }

  const severities = [
    { label: 'Critical', count: audit.critical, cls: severityBadgeClass('critical') },
    { label: 'High', count: audit.high, cls: severityBadgeClass('high') },
    { label: 'Moderate', count: audit.moderate, cls: severityBadgeClass('moderate') },
    { label: 'Low', count: audit.low, cls: severityBadgeClass('low') },
  ];

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {audit.total === 0 ? (
            <span className="px-2 py-1 rounded-full bg-[#22c55e]/15 text-[#22c55e] text-xs font-medium">
              No issues found
            </span>
          ) : (
            severities
              .filter((s) => s.count > 0)
              .map((s) => (
                <span key={s.label} className={`px-2 py-1 rounded-full text-xs font-medium ${s.cls}`}>
                  {s.count} {s.label}
                </span>
              ))
          )}
        </div>
        <button
          onClick={onRunAudit}
          disabled={isAuditing}
          className="px-3 py-1 rounded-button text-xs font-medium bg-surface-2 text-text-secondary hover:bg-surface-3 transition-colors disabled:opacity-50"
        >
          {isAuditing ? 'Auditing...' : 'Re-run'}
        </button>
      </div>

      {/* Vulnerability table */}
      {audit.vulnerabilities.length > 0 && (
        <div className="bg-surface-1 border border-border-subtle rounded-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-3 py-2 text-text-tertiary font-medium">Package</th>
                <th className="text-left px-3 py-2 text-text-tertiary font-medium">Severity</th>
                <th className="text-left px-3 py-2 text-text-tertiary font-medium">Issue</th>
              </tr>
            </thead>
            <tbody>
              {audit.vulnerabilities.slice(0, 20).map((vuln, i) => (
                <tr key={`${vuln.name}-${i}`} className="border-b border-border-subtle last:border-b-0">
                  <td className="px-3 py-2 text-text-primary font-mono">{vuln.name}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${severityBadgeClass(vuln.severity)}`}>
                      {vuln.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-secondary truncate max-w-[200px]">{vuln.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggested Agents
// ---------------------------------------------------------------------------

function SuggestedAgents({ agents, projectType }: { agents: string[]; projectType: string | null }) {
  if (agents.length === 0 && !projectType) return null;

  return (
    <div className="space-y-2">
      {projectType && (
        <p className="text-xs text-text-tertiary">
          Detected: <span className="text-accent font-medium">{projectType}</span>
        </p>
      )}
      {agents.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {agents.map((agent) => (
            <span
              key={agent}
              className="px-2 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium"
            >
              {agent}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

export default function ProjectIntelPanel({ projectPath }: ProjectIntelPanelProps) {
  const { intel, isLoading, error, refresh, runAudit, isAuditing } = useProjectIntel(projectPath);

  if (isLoading && !intel) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-text-tertiary text-xs py-4">
          <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          Analyzing project...
        </div>
      </div>
    );
  }

  if (error && !intel) {
    return (
      <div className="bg-surface-1 border border-border-subtle rounded-card px-4 py-3">
        <p className="text-xs text-status-error">{error}</p>
        <button
          onClick={refresh}
          className="mt-2 text-xs text-accent hover:opacity-80 transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!intel) return null;

  return (
    <div className="space-y-5">
      {/* Health Score */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Health Score
          </h3>
          <button
            onClick={refresh}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Refresh
          </button>
        </div>
        <HealthRing score={intel.healthScore} />
      </section>

      {/* Cost Tracking */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
          API Cost
        </h3>
        <CostCards cost={intel.costSummary} />
      </section>

      {/* Dependency Audit */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
          Dependencies
        </h3>
        <DependencyAuditSection
          audit={intel.dependencyAudit}
          isAuditing={isAuditing}
          onRunAudit={runAudit}
        />
      </section>

      {/* Suggested Agents */}
      {(intel.suggestedAgents.length > 0 || intel.projectType) && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
            Suggested Agents
          </h3>
          <SuggestedAgents agents={intel.suggestedAgents} projectType={intel.projectType} />
        </section>
      )}
    </div>
  );
}
