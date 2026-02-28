import React, { useState } from 'react';
import type { DailyData } from '../../hooks/useUsageTracker';

interface UsageChartProps {
  data: DailyData[];
  mode: 'cost' | 'tokens';
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  return `${parts[1]}/${parts[2]}`;
}

function formatCost(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export default function UsageChart({ data, mode }: UsageChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-surface-1 rounded-lg border border-border-subtle">
        <span className="text-text-tertiary text-sm">No usage data for this period</span>
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.map((d) => (mode === 'cost' ? d.costUSD : d.totalTokens)),
    0.01 // prevent division by zero
  );

  return (
    <div className="bg-surface-1 rounded-lg border border-border-subtle p-4">
      <div className="flex items-end gap-[2px] h-48 relative">
        {data.map((day, i) => {
          const value = mode === 'cost' ? day.costUSD : day.totalTokens;
          const heightPercent = Math.max((value / maxValue) * 100, 1);
          const isHovered = hoveredIndex === i;

          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center justify-end h-full relative"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full mb-2 z-10 bg-surface-3 border border-border-default rounded-md px-3 py-2 text-xs whitespace-nowrap shadow-lg pointer-events-none">
                  <div className="text-text-primary font-medium mb-1">{day.date}</div>
                  <div className="text-text-secondary">Cost: {formatCost(day.costUSD)}</div>
                  <div className="text-text-secondary">Input: {formatTokens(day.inputTokens)}</div>
                  <div className="text-text-secondary">Output: {formatTokens(day.outputTokens)}</div>
                  <div className="text-text-secondary">Sessions: {day.sessionCount}</div>
                </div>
              )}

              {/* Bar */}
              <div
                className={`w-full rounded-t transition-colors ${
                  isHovered ? 'bg-accent' : 'bg-accent/70'
                }`}
                style={{ height: `${heightPercent}%`, minHeight: '2px' }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels — show subset to avoid overlap */}
      <div className="flex justify-between mt-2 px-0">
        {data.length <= 14
          ? data.map((d) => (
              <span key={d.date} className="text-micro text-text-tertiary flex-1 text-center">
                {formatDate(d.date)}
              </span>
            ))
          : [0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor((data.length * 3) / 4), data.length - 1].map(
              (idx) =>
                data[idx] && (
                  <span key={data[idx].date} className="text-micro text-text-tertiary">
                    {formatDate(data[idx].date)}
                  </span>
                )
            )}
      </div>
    </div>
  );
}
