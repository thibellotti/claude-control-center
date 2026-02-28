import React from 'react';

interface TypographyPreviewProps {
  fontFamily: Record<string, string[]>;
  fontSize: Record<string, string | [string, { lineHeight?: string }]>;
}

const SAMPLE_TEXT = 'The quick brown fox jumps over the lazy dog';

// Convert fontSize value to a readable string
function getFontSizeValue(
  value: string | [string, { lineHeight?: string }]
): { size: string; lineHeight?: string } {
  if (typeof value === 'string') {
    return { size: value };
  }
  if (Array.isArray(value)) {
    return { size: value[0], lineHeight: value[1]?.lineHeight };
  }
  return { size: '1rem' };
}

// Convert a size string to pixels for the sample display
function toPxString(size: string): string {
  if (size.endsWith('rem')) {
    return `${parseFloat(size) * 16}px`;
  }
  if (size.endsWith('em')) {
    return `${parseFloat(size) * 16}px`;
  }
  return size;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-3">
      {title}
    </h4>
  );
}

export default function TypographyPreview({
  fontFamily,
  fontSize,
}: TypographyPreviewProps) {
  const hasFontSizes = Object.keys(fontSize).length > 0;
  const hasFontFamilies = Object.keys(fontFamily).length > 0;

  if (!hasFontSizes && !hasFontFamilies) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-text-tertiary">
          No typography tokens found in the config.
        </p>
      </div>
    );
  }

  // Sort font sizes by their pixel value
  const sortedSizes = Object.entries(fontSize).sort((a, b) => {
    const aSize = getFontSizeValue(a[1]).size;
    const bSize = getFontSizeValue(b[1]).size;
    const aPx = parseFloat(toPxString(aSize));
    const bPx = parseFloat(toPxString(bSize));
    return aPx - bPx;
  });

  return (
    <div className="space-y-8 py-4">
      {/* Font Families */}
      {hasFontFamilies && (
        <section>
          <SectionHeader title="Font Families" />
          <div className="space-y-4">
            {Object.entries(fontFamily).map(([name, families]) => (
              <div
                key={name}
                className="bg-surface-1 border border-border-subtle rounded-card p-4"
              >
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-xs font-semibold text-text-primary">{name}</span>
                  <span className="text-micro font-mono text-text-tertiary">
                    {families.join(', ')}
                  </span>
                </div>
                <p
                  className="text-base text-text-secondary leading-relaxed"
                  style={{ fontFamily: families.join(', ') }}
                >
                  {SAMPLE_TEXT}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Font Sizes */}
      {hasFontSizes && (
        <section>
          <SectionHeader title="Font Sizes" />
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-[100px_80px_1fr] gap-3 pb-2 border-b border-border-subtle">
              <span className="text-micro font-semibold uppercase tracking-wider text-text-tertiary">
                Name
              </span>
              <span className="text-micro font-semibold uppercase tracking-wider text-text-tertiary">
                Size
              </span>
              <span className="text-micro font-semibold uppercase tracking-wider text-text-tertiary">
                Sample
              </span>
            </div>

            {/* Size rows */}
            {sortedSizes.map(([name, value]) => {
              const { size, lineHeight } = getFontSizeValue(value);
              const pxValue = toPxString(size);

              return (
                <div
                  key={name}
                  className="grid grid-cols-[100px_80px_1fr] gap-3 items-baseline py-2 hover:bg-surface-1 rounded transition-colors"
                >
                  {/* Name */}
                  <span className="text-xs font-mono text-text-primary">{name}</span>

                  {/* Size info */}
                  <div className="flex flex-col">
                    <span className="text-xs font-mono text-text-secondary">{size}</span>
                    {lineHeight && (
                      <span className="text-micro font-mono text-text-tertiary">
                        lh: {lineHeight}
                      </span>
                    )}
                  </div>

                  {/* Sample text */}
                  <p
                    className="text-text-secondary truncate"
                    style={{
                      fontSize: pxValue,
                      lineHeight: lineHeight || undefined,
                    }}
                  >
                    {SAMPLE_TEXT}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
