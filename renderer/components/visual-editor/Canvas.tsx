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

  // Inject overlay via Electron's WebFrameMain API (main process).
  // This is the only reliable method because the parent window and the iframe
  // have different origins (different ports in dev, app:// vs http:// in prod),
  // which means renderer-side contentDocument access always throws a SecurityError.
  const injectViaMainProcess = useCallback(async (frameUrl: string) => {
    try {
      const result = await window.api.visualEditorInjectFrame(frameUrl);
      if ('error' in result && result.error) {
        console.warn('[Canvas] Frame injection failed:', result.error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Canvas] visualEditorInjectFrame IPC error:', err);
      return false;
    }
  }, []);

  // Called when the iframe finishes loading its page.
  // Reset injectedRef on every load so SPA navigations always re-inject.
  const handleLoad = useCallback(async () => {
    if (!iframeRef.current || !overlayScript) return;
    injectedRef.current = false; // Reset on each iframe load

    // Derive the loaded URL from the iframe src (the actual src at load time).
    // We use previewUrl as the target origin for the frame lookup.
    const frameUrl = iframeRef.current.src || previewUrl;
    const ok = await injectViaMainProcess(frameUrl);
    if (ok) {
      injectedRef.current = true;
    }
  }, [overlayScript, previewUrl, injectViaMainProcess]);

  // Listen for postMessage from iframe overlay script
  useEffect(() => {
    function handler(event: MessageEvent) {
      if (!event.data || typeof event.data.type !== 'string') return;
      if (!event.data.type.startsWith('forma:')) return;
      onOverlayMessage(event);
    }

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onOverlayMessage]);

  // When overlayScript becomes available (after activate() resolves), retry injection.
  // Also re-inject on iframe navigation (injectedRef reset lets handleLoad proceed).
  useEffect(() => {
    injectedRef.current = false;
    if (overlayScript && iframeRef.current) {
      // If the iframe has already loaded its page (src was set before activate() resolved),
      // onLoad won't fire again — call handleLoad directly.
      handleLoad();
    }
  }, [overlayScript, handleLoad]);

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
          // allow-scripts: required so the injected overlay.js can run.
          // allow-same-origin: required so the overlay can read DOM and call postMessage.
          // The injection itself is done from the main process via WebFrameMain,
          // not from this renderer, so cross-origin contentDocument is never attempted.
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  );
}
