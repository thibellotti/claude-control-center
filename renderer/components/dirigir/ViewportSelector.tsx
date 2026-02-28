import React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ViewportSelectorProps {
  currentWidth: number;
  onChangeWidth: (width: number) => void;
}

// ---------------------------------------------------------------------------
// Viewports
// ---------------------------------------------------------------------------

const VIEWPORTS = [
  { label: 'Desktop', width: 1280, icon: 'monitor' },
  { label: 'Tablet', width: 768, icon: 'tablet' },
  { label: 'Mobile', width: 375, icon: 'phone' },
] as const;

// ---------------------------------------------------------------------------
// Inline icons — 16x16, stroke-based
// ---------------------------------------------------------------------------

function MonitorIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.5 14h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 11v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function TabletIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="1.5" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 12h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="1.5" width="8" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 12h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const iconMap = {
  monitor: MonitorIcon,
  tablet: TabletIcon,
  phone: PhoneIcon,
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ViewportSelector = React.memo(function ViewportSelector({
  currentWidth,
  onChangeWidth,
}: ViewportSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-surface-2 rounded-badge p-0.5">
      {VIEWPORTS.map((vp) => {
        const isActive = currentWidth === vp.width;
        const Icon = iconMap[vp.icon];

        return (
          <button
            key={vp.width}
            onClick={() => onChangeWidth(vp.width)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-badge text-xs transition-colors ${
              isActive
                ? 'bg-surface-0 text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
            aria-label={`${vp.label} viewport (${vp.width}px)`}
          >
            <Icon />
            <span>{vp.label}</span>
            {isActive && (
              <span className="text-micro text-text-tertiary ml-0.5">
                {vp.width}px
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});

export default ViewportSelector;
