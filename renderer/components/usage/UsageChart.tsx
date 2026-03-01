import React, { useState, useMemo } from 'react';
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

function formatYLabel(value: number, mode: 'cost' | 'tokens'): string {
  if (mode === 'cost') {
    if (value >= 1) return `$${value.toFixed(0)}`;
    if (value >= 0.1) return `$${value.toFixed(1)}`;
    return `$${value.toFixed(2)}`;
  }
  return formatTokens(value);
}

/** Check if a date string (YYYY-MM-DD) is today */
function isToday(dateStr: string): boolean {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return dateStr === `${y}-${m}-${d}`;
}

/** Generate nice Y-axis tick values */
function computeYTicks(max: number, count: number): number[] {
  if (max <= 0) return [0];

  // Round the max up to a "nice" number
  const rawStep = max / (count - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceSteps = [1, 2, 2.5, 5, 10];
  const niceStep =
    niceSteps.find((s) => s * magnitude >= rawStep)! * magnitude;

  const ticks: number[] = [];
  for (let i = 0; i < count; i++) {
    ticks.push(niceStep * i);
  }
  return ticks;
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
    0.01
  );

  const TICK_COUNT = 5;
  const yTicks = useMemo(() => computeYTicks(maxValue, TICK_COUNT), [maxValue]);
  const chartMax = yTicks[yTicks.length - 1] || maxValue;

  // Check if the last data point is today
  const lastIsToday = data.length > 0 && isToday(data[data.length - 1].date);

  return (
    <div className="bg-surface-1 rounded-lg border border-border-subtle p-4">
      <div className="flex gap-0">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between h-48 pr-3 shrink-0 w-12">
          {[...yTicks].reverse().map((tick, i) => (
            <span
              key={i}
              className="text-[10px] leading-none text-text-tertiary text-right"
            >
              {formatYLabel(tick, mode)}
            </span>
          ))}
        </div>

        {/* Chart area */}
        <div className="flex-1 relative h-48">
          {/* Horizontal grid lines */}
          {yTicks.map((tick, i) => {
            const bottomPercent = chartMax > 0 ? (tick / chartMax) * 100 : 0;
            return (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-border-subtle/50"
                style={{
                  bottom: `${bottomPercent}%`,
                  borderStyle: i === 0 ? 'solid' : 'dashed',
                }}
              />
            );
          })}

          {/* Bars */}
          <div className="flex items-end gap-[2px] h-full relative z-10">
            {data.map((day, i) => {
              const value = mode === 'cost' ? day.costUSD : day.totalTokens;
              const heightPercent = Math.max((value / chartMax) * 100, 1);
              const isHovered = hoveredIndex === i;
              const isTodayBar = lastIsToday && i === data.length - 1;

              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center justify-end h-full relative"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute bottom-full mb-2 z-20 bg-surface-3 border border-border-default rounded-md px-3 py-2 text-xs whitespace-nowrap shadow-lg pointer-events-none">
                      <div className="text-text-primary font-medium mb-1">
                        {day.date}
                        {isTodayBar && (
                          <span className="ml-1.5 text-accent text-[10px] font-normal">today</span>
                        )}
                      </div>
                      <div className="text-text-secondary">Cost: {formatCost(day.costUSD)}</div>
                      <div className="text-text-secondary">Input: {formatTokens(day.inputTokens)}</div>
                      <div className="text-text-secondary">Output: {formatTokens(day.outputTokens)}</div>
                      <div className="text-text-secondary">Sessions: {day.sessionCount}</div>
                    </div>
                  )}

                  {/* Bar — rounded top, gradient accent */}
                  <div
                    className={`w-full rounded-t-[3px] transition-all duration-150 ${
                      isTodayBar
                        ? isHovered
                          ? 'bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb,99,102,241),0.4)]'
                          : 'bg-accent shadow-[0_0_6px_rgba(var(--accent-rgb,99,102,241),0.25)]'
                        : isHovered
                          ? 'bg-accent'
                          : 'bg-accent/60'
                    }`}
                    style={{ height: `${heightPercent}%`, minHeight: '2px' }}
                  />

                  {/* Today dot indicator */}
                  {isTodayBar && (
                    <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-accent" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2.5 pl-12">
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
