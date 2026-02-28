import React, { useState, useEffect, useCallback } from 'react';
import { useVisualDiff, VIEWPORT_PRESETS } from '../../hooks/useVisualDiff';
import ScreenshotSlider from './ScreenshotSlider';
import type { ScreenshotEntry } from '../../../shared/types';
import { CameraIcon, TrashIcon, LayersIcon, CheckIcon, CloseIcon } from '../icons';

interface VisualDiffProps {
  projectId: string;
  projectPath: string;
}

// -- Thumbnail card --

interface ThumbnailCardProps {
  screenshot: ScreenshotEntry;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  loadImage: (path: string) => Promise<string | null>;
}

function ThumbnailCard({
  screenshot,
  isSelected,
  onSelect,
  onDelete,
  loadImage,
}: ThumbnailCardProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadImage(screenshot.imagePath).then((data) => {
      if (!cancelled && data) setSrc(data);
    });
    return () => {
      cancelled = true;
    };
  }, [screenshot.imagePath, loadImage]);

  const dateStr = new Date(screenshot.timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`group relative rounded-lg border overflow-hidden transition-colors cursor-pointer ${
        isSelected
          ? 'border-accent bg-surface-2'
          : 'border-border-subtle hover:border-border-default bg-surface-1'
      }`}
      onClick={onSelect}
    >
      {/* Selection indicator */}
      <div
        className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          isSelected
            ? 'border-accent bg-accent text-white'
            : 'border-border-default bg-surface-0/80 text-transparent group-hover:border-border-strong'
        }`}
      >
        <CheckIcon size={10} />
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-2 right-2 z-10 p-1 rounded bg-surface-0/80 text-text-tertiary hover:text-feedback-error hover:bg-surface-0 opacity-0 group-hover:opacity-100 transition-all"
        title="Delete screenshot"
      >
        <TrashIcon />
      </button>

      {/* Thumbnail */}
      <div className="aspect-video bg-surface-0 flex items-center justify-center">
        {src ? (
          <img
            src={src}
            alt={screenshot.label}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-4 h-4 border-2 border-border-default border-t-accent rounded-full animate-spin" />
        )}
      </div>

      {/* Meta */}
      <div className="px-3 py-2">
        <p className="text-xs font-medium text-text-primary truncate">
          {screenshot.label}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-micro text-text-tertiary">{dateStr}</span>
          <span className="text-micro text-text-tertiary">
            {screenshot.viewport.width}x{screenshot.viewport.height}
          </span>
        </div>
        {screenshot.commitHash && (
          <p className="text-micro text-text-tertiary mt-1 truncate font-mono">
            {screenshot.commitHash.slice(0, 7)}
            {screenshot.commitMessage ? ` — ${screenshot.commitMessage}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

// -- Main component --

export default function VisualDiff({ projectId }: VisualDiffProps) {
  const {
    screenshots,
    isLoading,
    isCapturing,
    error,
    capture,
    remove,
    selectedIds,
    selectedPair,
    selectForComparison,
    clearComparison,
    loadImage,
  } = useVisualDiff(projectId);

  // Capture form state
  const [url, setUrl] = useState('http://localhost:3000');
  const [label, setLabel] = useState('');
  const [viewportIndex, setViewportIndex] = useState(0);
  const selectedViewport = VIEWPORT_PRESETS[viewportIndex];

  // Comparison image data
  const [beforeSrc, setBeforeSrc] = useState<string | null>(null);
  const [afterSrc, setAfterSrc] = useState<string | null>(null);

  // Load comparison images when pair changes
  useEffect(() => {
    if (!selectedPair) {
      setBeforeSrc(null);
      setAfterSrc(null);
      return;
    }

    let cancelled = false;
    const [before, after] = selectedPair;

    Promise.all([
      loadImage(before.imagePath),
      loadImage(after.imagePath),
    ]).then(([bSrc, aSrc]) => {
      if (!cancelled) {
        setBeforeSrc(bSrc);
        setAfterSrc(aSrc);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedPair, loadImage]);

  const handleCapture = useCallback(async () => {
    if (!url.trim()) return;
    const captureLabel = label.trim() || `Screenshot ${screenshots.length + 1}`;
    try {
      await capture(
        url.trim(),
        captureLabel,
        { width: selectedViewport.width, height: selectedViewport.height }
      );
      setLabel('');
    } catch {
      // Error is already set in the hook
    }
  }, [url, label, selectedViewport, screenshots.length, capture]);

  // Loading state
  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block w-5 h-5 border-2 border-border-default border-t-accent rounded-full animate-spin" />
        <p className="text-sm text-text-tertiary mt-3">Loading screenshots...</p>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-6">
      {/* Capture section */}
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-3">Capture</h3>
        <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 space-y-3">
          {/* URL input */}
          <div>
            <label className="block text-[11px] text-text-tertiary mb-1">URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:3000"
              className="w-full bg-surface-0 border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-primary placeholder-text-tertiary outline-none focus:border-border-default transition-colors"
            />
          </div>

          {/* Label input */}
          <div>
            <label className="block text-[11px] text-text-tertiary mb-1">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Homepage, Header redesign..."
              className="w-full bg-surface-0 border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-primary placeholder-text-tertiary outline-none focus:border-border-default transition-colors"
            />
          </div>

          {/* Viewport presets */}
          <div>
            <label className="block text-[11px] text-text-tertiary mb-1">Viewport</label>
            <div className="flex items-center gap-1.5">
              {VIEWPORT_PRESETS.map((preset, i) => (
                <button
                  key={preset.label}
                  onClick={() => setViewportIndex(i)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    viewportIndex === i
                      ? 'bg-accent text-white'
                      : 'bg-surface-2 text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {preset.label} ({preset.width}x{preset.height})
                </button>
              ))}
            </div>
          </div>

          {/* Capture button */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleCapture}
              disabled={isCapturing || !url.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCapturing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <CameraIcon />
                  Capture Screenshot
                </>
              )}
            </button>

            {error && (
              <p className="text-xs text-feedback-error flex-1 truncate">{error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Comparison section (when 2 screenshots selected) */}
      {selectedPair && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-text-primary">Compare</h3>
            <button
              onClick={clearComparison}
              className="flex items-center gap-1 px-2 py-1 rounded-button text-[11px] text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <CloseIcon size={12} />
              Clear
            </button>
          </div>

          {/* Labels for what is being compared */}
          <div className="flex items-center justify-between mb-2 text-[11px] text-text-tertiary">
            <span>
              Before: <span className="text-text-secondary font-medium">{selectedPair[0].label}</span>
            </span>
            <span>
              After: <span className="text-text-secondary font-medium">{selectedPair[1].label}</span>
            </span>
          </div>

          {beforeSrc && afterSrc ? (
            <ScreenshotSlider
              beforeSrc={beforeSrc}
              afterSrc={afterSrc}
              beforeLabel={selectedPair[0].label}
              afterLabel={selectedPair[1].label}
            />
          ) : (
            <div className="flex items-center justify-center py-12 bg-surface-1 border border-border-subtle rounded-lg">
              <div className="w-5 h-5 border-2 border-border-default border-t-accent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Gallery section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-text-primary">Gallery</h3>
            {screenshots.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-micro font-medium bg-surface-3 text-text-tertiary">
                {screenshots.length}
              </span>
            )}
          </div>
          {selectedIds.length > 0 && selectedIds.length < 2 && (
            <p className="text-[11px] text-text-tertiary">
              Select one more to compare
            </p>
          )}
        </div>

        {screenshots.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-text-tertiary mb-3 flex justify-center">
              <LayersIcon />
            </div>
            <p className="text-sm text-text-secondary">No screenshots yet</p>
            <p className="text-xs text-text-tertiary mt-1">
              Capture a screenshot above to get started with visual comparison.
            </p>
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            }}
          >
            {screenshots.map((s) => (
              <ThumbnailCard
                key={s.id}
                screenshot={s}
                isSelected={selectedIds.includes(s.id)}
                onSelect={() => selectForComparison(s.id)}
                onDelete={() => remove(s.id)}
                loadImage={loadImage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
