import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { DesignRequest } from '../../../shared/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DesignReplaySliderProps {
  requests: DesignRequest[];
  onSelectRequest?: (request: DesignRequest) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COMPLETED_STATUSES = new Set<string>(['approved', 'review', 'rejected']);

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

// ---------------------------------------------------------------------------
// Dot component
// ---------------------------------------------------------------------------

interface TimelineDotProps {
  request: DesignRequest;
  position: number; // 0-100 percentage
  isSelected: boolean;
  onClick: () => void;
}

const TimelineDot = React.memo(function TimelineDot({
  request,
  position,
  isSelected,
  onClick,
}: TimelineDotProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
      style={{ left: `${position}%` }}
    >
      {/* Tooltip */}
      {hovered && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-2 border border-border-subtle rounded-button text-micro text-text-primary whitespace-nowrap max-w-[200px] truncate pointer-events-none">
          {truncate(request.prompt, 40)}
        </div>
      )}

      {/* Dot */}
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`w-3 h-3 rounded-full bg-accent border-2 border-surface-0 hover:scale-125 transition-transform cursor-pointer ${
          isSelected ? 'ring-2 ring-accent/40' : ''
        }`}
        aria-label={truncate(request.prompt, 40)}
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Comparison panel
// ---------------------------------------------------------------------------

interface ComparisonPanelProps {
  request: DesignRequest;
}

const ComparisonPanel = React.memo(function ComparisonPanel({
  request,
}: ComparisonPanelProps) {
  const [beforeSrc, setBeforeSrc] = useState<string | null>(null);
  const [afterSrc, setAfterSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (request.screenshotBefore) {
        const data = await window.api.getScreenshotImage(
          request.screenshotBefore
        );
        if (!cancelled && data) setBeforeSrc(data);
      }
      if (request.screenshotAfter) {
        const data = await window.api.getScreenshotImage(
          request.screenshotAfter
        );
        if (!cancelled && data) setAfterSrc(data);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [request.screenshotBefore, request.screenshotAfter]);

  const hasBoth = beforeSrc && afterSrc;

  if (!hasBoth) return null;

  return (
    <div className="mt-2 p-2 bg-surface-1 border border-border-subtle rounded-card">
      <div className="flex items-start gap-3">
        {/* Before */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-micro text-text-tertiary">Before</span>
          <img
            src={beforeSrc}
            alt="Before"
            className="w-[120px] h-[80px] object-cover rounded border border-border-subtle"
          />
        </div>

        {/* After */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-micro text-text-tertiary">After</span>
          <img
            src={afterSrc}
            alt="After"
            className="w-[120px] h-[80px] object-cover rounded border border-border-subtle"
          />
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const DesignReplaySlider = React.memo(function DesignReplaySlider({
  requests,
  onSelectRequest,
}: DesignReplaySliderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filter to completed requests only
  const completed = useMemo(
    () => requests.filter((r) => COMPLETED_STATUSES.has(r.status)),
    [requests]
  );

  // Compute time range for positioning
  const timeRange = useMemo(() => {
    if (completed.length === 0) return { min: 0, max: 0, span: 0 };
    const times = completed.map((r) => r.completedAt ?? r.createdAt);
    const min = Math.min(...times);
    const max = Math.max(...times);
    return { min, max, span: max - min };
  }, [completed]);

  // Get position for a request (0-100)
  const getPosition = useCallback(
    (request: DesignRequest): number => {
      if (completed.length === 1) return 50;
      if (timeRange.span === 0) return 50;
      const t = request.completedAt ?? request.createdAt;
      return ((t - timeRange.min) / timeRange.span) * 100;
    },
    [completed.length, timeRange]
  );

  const handleSelect = useCallback(
    (request: DesignRequest) => {
      const newId = selectedId === request.id ? null : request.id;
      setSelectedId(newId);
      if (newId && onSelectRequest) {
        onSelectRequest(request);
      }
    },
    [selectedId, onSelectRequest]
  );

  const selectedRequest = useMemo(
    () => completed.find((r) => r.id === selectedId) ?? null,
    [completed, selectedId]
  );

  // No completed requests
  if (completed.length === 0) {
    return (
      <div className="w-full">
        <div className="relative">
          {/* Empty track */}
          <div className="h-1 bg-surface-3 rounded-badge relative">
            {/* Current time indicator */}
            <div className="w-0.5 h-3 bg-accent absolute right-0 top-1/2 -translate-y-1/2" />
          </div>
        </div>
        <p className="text-micro text-text-tertiary mt-1">No history yet</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Track */}
      <div className="h-1 bg-surface-3 rounded-badge relative">
        {/* Dots */}
        {completed.map((request) => (
          <TimelineDot
            key={request.id}
            request={request}
            position={getPosition(request)}
            isSelected={selectedId === request.id}
            onClick={() => handleSelect(request)}
          />
        ))}

        {/* Current time indicator */}
        <div className="w-0.5 h-3 bg-accent absolute right-0 top-1/2 -translate-y-1/2" />
      </div>

      {/* Comparison panel */}
      {selectedRequest && <ComparisonPanel request={selectedRequest} />}
    </div>
  );
});

export default DesignReplaySlider;
