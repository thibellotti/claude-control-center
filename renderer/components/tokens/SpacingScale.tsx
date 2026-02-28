import React from 'react';

interface SpacingScaleProps {
  spacing: Record<string, string>;
}

// Convert a spacing value to pixels for visual bar width.
// Handles rem, px, em values.
function toPixels(value: string): number {
  const trimmed = value.trim();

  if (trimmed.endsWith('rem')) {
    return parseFloat(trimmed) * 16;
  }
  if (trimmed.endsWith('em')) {
    return parseFloat(trimmed) * 16;
  }
  if (trimmed.endsWith('px')) {
    return parseFloat(trimmed);
  }
  // Plain number — assume Tailwind default (multiply by 4 for spacing)
  const num = parseFloat(trimmed);
  if (!isNaN(num)) return num;
  return 0;
}

// Sort spacing entries by their numeric key or pixel value
function sortEntries(entries: [string, string][]): [string, string][] {
  return [...entries].sort((a, b) => {
    const numA = parseFloat(a[0]);
    const numB = parseFloat(b[0]);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return toPixels(a[1]) - toPixels(b[1]);
  });
}

export default function SpacingScale({ spacing }: SpacingScaleProps) {
  const entries = sortEntries(Object.entries(spacing));

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-text-tertiary">No spacing tokens found in the config.</p>
        <p className="text-xs text-text-tertiary mt-1">
          Tailwind uses a default spacing scale when none is defined.
        </p>
      </div>
    );
  }

  // Find the max pixel value for proportional bar widths
  const maxPx = Math.max(...entries.map(([, v]) => toPixels(v)), 1);

  return (
    <div className="py-4 space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[60px_80px_1fr] gap-3 pb-2 border-b border-border-subtle">
        <span className="text-micro font-semibold uppercase tracking-wider text-text-tertiary">
          Key
        </span>
        <span className="text-micro font-semibold uppercase tracking-wider text-text-tertiary">
          Value
        </span>
        <span className="text-micro font-semibold uppercase tracking-wider text-text-tertiary">
          Preview
        </span>
      </div>

      {/* Spacing rows */}
      {entries.map(([key, value]) => {
        const px = toPixels(value);
        const widthPercent = maxPx > 0 ? (px / maxPx) * 100 : 0;

        return (
          <div
            key={key}
            className="grid grid-cols-[60px_80px_1fr] gap-3 items-center py-1.5 group hover:bg-surface-1 rounded transition-colors"
          >
            {/* Key */}
            <span className="text-xs font-mono text-text-primary">{key}</span>

            {/* Value */}
            <span className="text-xs font-mono text-text-secondary">{value}</span>

            {/* Visual bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(widthPercent, 1)}%` }}
                />
              </div>
              <span className="text-micro text-text-tertiary font-mono w-10 text-right shrink-0">
                {px > 0 ? `${px}px` : '0'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
