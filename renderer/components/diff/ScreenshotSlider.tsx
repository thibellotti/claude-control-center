import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ScreenshotSliderProps {
  beforeSrc: string; // base64 data URL
  afterSrc: string; // base64 data URL
  beforeLabel: string;
  afterLabel: string;
}

export default function ScreenshotSlider({
  beforeSrc,
  afterSrc,
  beforeLabel,
  afterLabel,
}: ScreenshotSliderProps) {
  const [position, setPosition] = useState(50); // percentage 0-100
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      updatePosition(e.clientX);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [updatePosition]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg border border-border-subtle bg-surface-0 select-none"
      style={{ aspectRatio: '16 / 10' }}
      onMouseDown={handleMouseDown}
    >
      {/* After image (full, sits behind) */}
      <img
        src={afterSrc}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />

      {/* Before image (clipped to left of divider) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ width: containerRef.current?.offsetWidth || '100%' }}
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-accent z-10 pointer-events-none"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      />

      {/* Draggable handle */}
      <div
        className="absolute top-1/2 z-20 -translate-y-1/2 cursor-ew-resize"
        style={{ left: `${position}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className="w-8 h-8 rounded-full bg-accent border-2 border-white shadow-lg flex items-center justify-center">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 5L2 7l2 2M10 5l2 2-2 2"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 z-10">
        <span className="px-2 py-1 rounded text-micro font-medium bg-surface-4/80 text-text-primary backdrop-blur-sm">
          Before
        </span>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <span className="px-2 py-1 rounded text-micro font-medium bg-surface-4/80 text-text-primary backdrop-blur-sm">
          After
        </span>
      </div>
    </div>
  );
}
