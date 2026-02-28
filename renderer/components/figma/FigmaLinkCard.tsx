import React, { useState } from 'react';
import type { FigmaLink } from '../../../shared/types';
import { ExternalLinkIcon, EyeIcon, EyeOffIcon, TrashIcon } from '../icons';

interface FigmaLinkCardProps {
  link: FigmaLink;
  onDelete: (id: string) => void;
}

function truncateUrl(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) return url;
  // Show beginning and end
  const start = url.slice(0, maxLength - 10);
  const end = url.slice(-8);
  return `${start}...${end}`;
}

export default function FigmaLinkCard({ link, onDelete }: FigmaLinkCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const embedUrl = `https://www.figma.com/embed?embed_host=claude-studio&url=${encodeURIComponent(link.figmaUrl)}`;

  function handleOpenInFigma() {
    window.open(link.figmaUrl, '_blank');
  }

  return (
    <div
      className="bg-surface-1 border border-border-subtle rounded-lg overflow-hidden transition-colors hover:border-border-default"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary truncate">
            {link.label}
          </p>
          <p className="text-xs font-mono text-text-tertiary truncate mt-0.5">
            {truncateUrl(link.figmaUrl)}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleOpenInFigma}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
            title="Open in Figma"
          >
            <ExternalLinkIcon size={12} />
            <span>Open</span>
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
            title={expanded ? 'Hide preview' : 'Show preview'}
          >
            {expanded ? <EyeOffIcon /> : <EyeIcon />}
            <span>{expanded ? 'Hide' : 'Preview'}</span>
          </button>

          <button
            onClick={() => onDelete(link.id)}
            className={`flex items-center p-1.5 rounded-md text-xs transition-colors ${
              isHovered
                ? 'text-feedback-error hover:text-feedback-error hover:bg-feedback-error-muted'
                : 'text-transparent pointer-events-none'
            }`}
            title="Remove link"
          >
            <TrashIcon size={14} />
          </button>
        </div>
      </div>

      {/* Expanded embed */}
      {expanded && (
        <div className="border-t border-border-subtle">
          <iframe
            src={embedUrl}
            className="w-full bg-surface-0"
            style={{ height: '400px' }}
            allow="clipboard-write"
            title={`Figma embed: ${link.label}`}
          />
        </div>
      )}
    </div>
  );
}
