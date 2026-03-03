import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useVisualEditor } from '../../hooks/useVisualEditor';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import StatusBar from './StatusBar';
import Inspector from './Inspector';
import PromptInput from './PromptInput';

interface VisualEditorPageProps {
  projectPath: string;
  previewUrl: string;
  onExit: () => void;
}

type ServerPhase = 'checking' | 'starting' | 'waiting' | 'ready' | 'error';

export default function VisualEditorPage({ projectPath, previewUrl, onExit }: VisualEditorPageProps) {
  const editor = useVisualEditor(projectPath, previewUrl);

  const [serverPhase, setServerPhase] = useState<ServerPhase>('checking');
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  // Auto-start dev server and wait until ready
  const bootServer = useCallback(async () => {
    cancelledRef.current = false;
    setServerPhase('checking');
    setServerError(null);

    try {
      const status = await window.api.getDevServerStatus(projectPath);
      if (cancelledRef.current) return;

      if (status.status === 'ready' && status.url) {
        setResolvedUrl(status.url);
        setServerPhase('ready');
        return;
      }

      if (status.status === 'idle' || status.status === 'error') {
        setServerPhase('starting');
        const result = await window.api.startDevServer(projectPath);
        if (cancelledRef.current) return;

        if (result.status === 'ready' && result.url) {
          setResolvedUrl(result.url);
          setServerPhase('ready');
          return;
        }
      }

      // Server is starting but not ready yet — poll until ready
      setServerPhase('waiting');
      const maxWait = 60_000;
      const start = Date.now();

      while (Date.now() - start < maxWait && !cancelledRef.current) {
        await new Promise(r => setTimeout(r, 1000));
        const poll = await window.api.getDevServerStatus(projectPath);
        if (cancelledRef.current) return;

        if (poll.status === 'ready' && poll.url) {
          setResolvedUrl(poll.url);
          setServerPhase('ready');
          return;
        }
        if (poll.status === 'error') {
          setServerError(poll.error || 'Dev server failed to start');
          setServerPhase('error');
          return;
        }
      }

      if (!cancelledRef.current) {
        setServerError('Dev server took too long to start');
        setServerPhase('error');
      }
    } catch (err) {
      if (!cancelledRef.current) {
        setServerError(err instanceof Error ? err.message : 'Failed to start dev server');
        setServerPhase('error');
      }
    }
  }, [projectPath]);

  // Boot server on mount
  useEffect(() => {
    bootServer();
    return () => { cancelledRef.current = true; };
  }, [bootServer]);

  // Activate overlay once server is ready
  useEffect(() => {
    if (serverPhase !== 'ready') return;
    editor.activate();
    return () => { editor.deactivate(); };
  }, [serverPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  const finalUrl = resolvedUrl || previewUrl;

  // Loading / error screen
  if (serverPhase !== 'ready') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-surface-0">
        <Toolbar
          viewport={editor.viewport}
          canUndo={false}
          canRedo={false}
          checkpointCount={0}
          onViewportChange={editor.setViewport}
          onUndo={() => {}}
          onRedo={() => {}}
          onExit={onExit}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 max-w-[360px] text-center">
            {serverPhase === 'error' ? (
              <>
                <div className="w-3 h-3 rounded-full bg-feedback-error" />
                <p className="text-sm text-feedback-error">{serverError}</p>
                <button
                  onClick={bootServer}
                  className="px-4 py-2 rounded-button text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
                >
                  Retry
                </button>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
                <p className="text-sm text-text-secondary">
                  {serverPhase === 'checking' && 'Checking dev server...'}
                  {serverPhase === 'starting' && 'Starting dev server...'}
                  {serverPhase === 'waiting' && 'Waiting for dev server to be ready...'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-0">
      <Toolbar
        viewport={editor.viewport}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        checkpointCount={editor.checkpointCount}
        onViewportChange={editor.setViewport}
        onUndo={editor.undo}
        onRedo={editor.redo}
        onExit={() => {
          editor.deactivate();
          onExit();
        }}
      />

      <div className="flex-1 flex min-h-0">
        {/* Inspector + Prompt on the LEFT */}
        <div className="flex-[35] min-w-0 border-r border-border-subtle bg-surface-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <Inspector
              selectedElement={editor.selectedElement}
              onExecuteAction={editor.executeAction}
            />
          </div>
          <PromptInput
            selectedElement={editor.selectedElement}
            isApplying={editor.isApplying}
            onExecuteAction={editor.executeAction}
          />
        </div>

        {/* Canvas on the RIGHT */}
        <div className="flex-[65] min-w-0">
          <Canvas
            previewUrl={finalUrl}
            viewport={editor.viewport}
            overlayScript={editor.overlayScript}
            onOverlayMessage={editor.handleOverlayMessage}
          />
        </div>
      </div>

      <StatusBar
        isApplying={editor.isApplying}
        lastError={editor.lastError}
        selectedElement={editor.selectedElement}
      />
    </div>
  );
}
