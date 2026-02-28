import React, { useEffect, useRef } from 'react';

interface XTerminalProps {
  sessionId: string;
  isVisible: boolean;
}

// Inject xterm CSS once at runtime (avoids SSR issues with CSS imports)
let cssInjected = false;
function injectXtermCSS() {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const style = document.createElement('style');
  style.id = 'xterm-styles';
  // Minimal xterm CSS for proper rendering
  style.textContent = `
    .xterm { position: relative; user-select: none; -ms-user-select: none; -webkit-user-select: none; cursor: text; }
    .xterm.focus, .xterm:focus { outline: none; }
    .xterm .xterm-helpers { position: absolute; top: 0; z-index: 5; }
    .xterm .xterm-helper-textarea { padding: 0; border: 0; margin: 0; position: absolute; opacity: 0; left: -9999em; top: 0; width: 0; height: 0; z-index: -5; white-space: nowrap; overflow: hidden; resize: none; }
    .xterm .composition-view { background: #000; color: #FFF; display: none; position: absolute; white-space: nowrap; z-index: 1; }
    .xterm .composition-view.active { display: block; }
    .xterm .xterm-viewport { background-color: #000; overflow-y: scroll; cursor: default; position: absolute; right: 0; left: 0; top: 0; bottom: 0; }
    .xterm .xterm-screen { position: relative; }
    .xterm .xterm-screen canvas { position: absolute; left: 0; top: 0; }
    .xterm .xterm-scroll-area { visibility: hidden; }
    .xterm-char-measure-element { display: inline-block; visibility: hidden; position: absolute; top: 0; left: -9999em; line-height: normal; }
    .xterm.enable-mouse-events { cursor: default; }
    .xterm.xterm-cursor-pointer, .xterm .xterm-cursor-pointer { cursor: pointer; }
    .xterm.column-select.focus { cursor: crosshair; }
    .xterm .xterm-accessibility:not(.debug), .xterm .xterm-message { position: absolute; left: 0; top: 0; bottom: 0; right: 0; z-index: 10; color: transparent; pointer-events: none; }
    .xterm .xterm-accessibility-tree:not(.debug) *::selection { color: transparent; }
    .xterm .xterm-accessibility-tree { user-select: text; white-space: pre; }
    .xterm .live-region { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
    .xterm-dim { opacity: 0.5; }
    .xterm-underline-1 { text-decoration: underline; }
    .xterm-underline-2 { text-decoration: double underline; }
    .xterm-underline-3 { text-decoration: wavy underline; }
    .xterm-underline-4 { text-decoration: dotted underline; }
    .xterm-underline-5 { text-decoration: dashed underline; }
    .xterm-overline { text-decoration: overline; }
    .xterm-strikethrough { text-decoration: line-through; }
    .xterm-screen .xterm-decoration-container .xterm-decoration { z-index: 6; position: absolute; }
    .xterm-screen .xterm-decoration-container .xterm-decoration.xterm-decoration-top-layer { z-index: 7; }
    .xterm-decoration-overview-ruler { z-index: 8; position: absolute; top: 0; right: 0; pointer-events: none; }
    .xterm-decoration-top { z-index: 2; position: relative; }
  `;
  document.head.appendChild(style);
}

export default function XTerminal({ sessionId, isVisible }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<unknown>(null);
  const fitRef = useRef<unknown>(null);

  useEffect(() => {
    injectXtermCSS();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;
    let cleanupData: (() => void) | null = null;
    let observer: ResizeObserver | null = null;

    // Dynamic import to avoid SSR issues (xterm requires browser globals)
    Promise.all([
      import('xterm'),
      import('@xterm/addon-fit'),
      import('@xterm/addon-web-links'),
    ]).then(([xtermModule, fitModule, linksModule]) => {
      if (disposed || !containerRef.current) return;

      const { Terminal } = xtermModule;
      const { FitAddon } = fitModule;
      const { WebLinksAddon } = linksModule;

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
        lineHeight: 1.35,
        letterSpacing: 0,
        theme: {
          background: '#0A0A0A',
          foreground: '#E5E5E5',
          cursor: '#E5E5E5',
          cursorAccent: '#0A0A0A',
          selectionBackground: 'rgba(255, 255, 255, 0.15)',
          selectionForeground: undefined,
          black: '#1A1A1A',
          red: '#FF6B6B',
          green: '#69DB7C',
          yellow: '#FFD43B',
          blue: '#748FFC',
          magenta: '#DA77F2',
          cyan: '#66D9E8',
          white: '#E5E5E5',
          brightBlack: '#555555',
          brightRed: '#FF8787',
          brightGreen: '#8CE99A',
          brightYellow: '#FFE066',
          brightBlue: '#91A7FF',
          brightMagenta: '#E599F7',
          brightCyan: '#99E9F2',
          brightWhite: '#FFFFFF',
        },
        scrollback: 5000,
        convertEol: true,
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);

      term.open(containerRef.current!);

      // Fit after a frame to ensure container has dimensions
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
          window.api.ptyResize(sessionId, term.cols, term.rows);
        } catch {
          // Container might not be visible yet
        }
      });

      // Send user input to pty
      term.onData((data: string) => {
        window.api.ptyWrite(sessionId, data);
      });

      // Receive pty output
      cleanupData = window.api.onPtyData(({ id, data }: { id: string; data: string }) => {
        if (id === sessionId) {
          term.write(data);
        }
      });

      termRef.current = term;
      fitRef.current = fitAddon;

      // Resize observer
      observer = new ResizeObserver(() => {
        try {
          fitAddon.fit();
          window.api.ptyResize(sessionId, term.cols, term.rows);
        } catch {
          // Ignore
        }
      });

      observer.observe(containerRef.current!);
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      cleanupData?.();
      if (termRef.current) {
        (termRef.current as { dispose: () => void }).dispose();
        termRef.current = null;
        fitRef.current = null;
      }
    };
  }, [sessionId]);

  // Re-fit when visibility changes
  useEffect(() => {
    if (isVisible && fitRef.current && termRef.current) {
      requestAnimationFrame(() => {
        try {
          (fitRef.current as { fit: () => void })?.fit();
          const term = termRef.current as { cols: number; rows: number; focus: () => void };
          if (term) {
            window.api.ptyResize(sessionId, term.cols, term.rows);
          }
        } catch {
          // Ignore
        }
      });
      (termRef.current as { focus: () => void }).focus();
    }
  }, [isVisible, sessionId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ display: isVisible ? 'block' : 'none' }}
    />
  );
}
