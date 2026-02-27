import React, { useState } from 'react';
import type { ComponentInfo } from '../../../shared/types';

interface ComponentCardProps {
  component: ComponentInfo;
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M3 4.5l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ComponentCard({ component }: ComponentCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-lg p-3 hover:border-border-default transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {component.hasTests && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"
                title="Has tests"
              />
            )}
            <span className="text-sm font-medium text-text-primary truncate">
              {component.name}
            </span>
          </div>
          <p className="text-xs font-mono text-text-tertiary truncate mt-0.5">
            {component.relativePath}
          </p>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 mt-2">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-3 text-text-secondary">
          {component.exportType}
        </span>
        {component.props.length > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-muted text-accent">
            {component.props.length} prop{component.props.length !== 1 ? 's' : ''}
          </span>
        )}
        <span className="text-[10px] text-text-tertiary ml-auto">
          {component.lineCount} lines
        </span>
      </div>

      {/* Expandable props section */}
      {component.props.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border-subtle">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors w-full"
          >
            <ChevronDownIcon open={expanded} />
            <span>Props</span>
          </button>

          {expanded && (
            <div className="mt-1.5 space-y-1">
              {component.props.map((prop) => (
                <div
                  key={prop.name}
                  className="flex items-center gap-2 text-[11px] pl-4"
                >
                  <div className="flex items-center gap-1 min-w-0">
                    {prop.required && (
                      <span
                        className="w-1 h-1 rounded-full bg-red-400 shrink-0"
                        title="Required"
                      />
                    )}
                    <span className="font-mono text-text-primary truncate">
                      {prop.name}
                    </span>
                  </div>
                  <span className="text-text-tertiary truncate flex-1 text-right">
                    {prop.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
