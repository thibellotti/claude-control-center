import React, { useRef, useEffect, useCallback } from 'react';

interface CanvasProps {
  previewUrl: string;
  viewport: 'desktop' | 'tablet' | 'mobile';
  overlayScript: string | null;
  onOverlayMessage: (event: MessageEvent) => void;
}

const VIEWPORT_WIDTHS = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export default function Canvas({ previewUrl, viewport, overlayScript, onOverlayMessage }: CanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const injectedRef = useRef(false);

  // Inject overlay script once iframe loads
  const handleLoad = useCallback(() => {
    if (!iframeRef.current || !overlayScript || injectedRef.current) return;

    try {
      const iframeWindow = iframeRef.current.contentWindow;
      if (iframeWindow) {
        // Use postMessage as primary injection method
        iframeWindow.postMessage({ type: 'forma:inject-overlay', script: overlayScript }, '*');

        // For localhost iframes, we can access contentDocument directly
        try {
          const doc = iframeRef.current.contentDocument;
          if (doc) {
            const scriptEl = doc.createElement('script');
            scriptEl.textContent = overlayScript;
            doc.body.appendChild(scriptEl);
            injectedRef.current = true;
          }
        } catch {
          // Cross-origin — fallback handled by postMessage
        }
      }
    } catch (err) {
      console.warn('Failed to inject overlay:', err);
    }
  }, [overlayScript]);

  // Listen for postMessage from iframe
  useEffect(() => {
    function handler(event: MessageEvent) {
      // Only process messages from our iframe
      if (!event.data || typeof event.data.type !== 'string') return;
      if (!event.data.type.startsWith('forma:')) return;
      onOverlayMessage(event);
    }

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onOverlayMessage]);

  // Reset injection flag when overlay script changes
  useEffect(() => {
    injectedRef.current = false;
  }, [overlayScript]);

  const viewportWidth = VIEWPORT_WIDTHS[viewport];
  const isFullWidth = viewport === 'desktop';

  return (
    <div className="h-full flex justify-center overflow-auto bg-surface-2">
      <div
        className="h-full transition-[width] duration-300 ease-in-out bg-white"
        style={{
          width: viewportWidth,
          maxWidth: '100%',
          ...(isFullWidth ? {} : { margin: '0 auto' }),
        }}
      >
        <iframe
          ref={iframeRef}
          src={previewUrl}
          onLoad={handleLoad}
          className="w-full h-full border-0"
          style={{ backgroundColor: 'white' }}
          title="Visual Editor Preview"
        />
      </div>
    </div>
  );
}
