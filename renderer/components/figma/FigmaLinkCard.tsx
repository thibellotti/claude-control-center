import React, { useState } from 'react';
import type { FigmaLink } from '../../../shared/types';

interface FigmaLinkCardProps {
  link: FigmaLink;
  onDelete: (id: string) => void;
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 2H3a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 2h3v3M6 6l4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 2l10 10M5.6 5.6a2 2 0 002.8 2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4.3C2.6 5.3 1 7 1 7s2.5 4 6 4c1 0 1.9-.3 2.7-.7M9.8 9.8c1.3-1 2.8-2.8 3.2-2.8-1-2.5-3-4-6-4-.5 0-1 .1-1.5.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 4h9M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M10.5 4v7a1 1 0 01-1 1h-5a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
            <ExternalLinkIcon />
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
                ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                : 'text-transparent pointer-events-none'
            }`}
            title="Remove link"
          >
            <TrashIcon />
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
