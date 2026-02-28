import React, { memo, useState } from 'react';
import type { ComponentInfo } from '../../../shared/types';
import { ChevronDownIcon } from '../icons';

interface ComponentCardProps {
  component: ComponentInfo;
}

export default memo(function ComponentCard({ component }: ComponentCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-lg p-3 hover:border-border-default transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {component.hasTests && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-feedback-success shrink-0"
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
        <span className="px-1.5 py-0.5 rounded text-micro font-medium bg-surface-3 text-text-secondary">
          {component.exportType}
        </span>
        {component.props.length > 0 && (
          <span className="px-1.5 py-0.5 rounded text-micro font-medium bg-accent-muted text-accent">
            {component.props.length} prop{component.props.length !== 1 ? 's' : ''}
          </span>
        )}
        <span className="text-micro text-text-tertiary ml-auto">
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
            <ChevronDownIcon className={`transition-transform ${expanded ? 'rotate-180' : ''}`} size={12} />
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
                        className="w-1 h-1 rounded-full bg-feedback-error shrink-0"
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
})
