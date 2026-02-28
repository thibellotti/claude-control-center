import React, { useCallback, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import dynamic from 'next/dynamic';
import type { Project } from '../../../shared/types';
import { useRequests } from '../../hooks/useRequests';
import { useAnnotations } from '../../hooks/useAnnotations';
import RequestBar from './RequestBar';
import RequestQueue from './RequestQueue';
import TranslatedFeed from './TranslatedFeed';
import PagesList from './PagesList';
import ViewportSelector from './ViewportSelector';
import DesignReplaySlider from './DesignReplaySlider';
import AnnotationOverlay from './AnnotationOverlay';
import { ChevronLeftIcon } from '../icons';

const PreviewPanel = dynamic(() => import('../preview/PreviewPanel'), { ssr: false });

interface DirigirCanvasProps {
  project: Project;
  onBack: () => void;
}

export default function DirigirCanvas({ project, onBack }: DirigirCanvasProps) {
  const {
    requests,
    feedEntries,
    activeRequest,
    createRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
    clearFeed,
  } = useRequests(project.id);

  const { clearAnnotations } = useAnnotations();
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [annotateMode, setAnnotateMode] = useState(false);

  const handleSubmit = useCallback(
    (prompt: string) => {
      createRequest(prompt, project.path);
    },
    [createRequest, project.path]
  );

  const handleAnnotationSubmit = useCallback(
    (prompt: string) => {
      createRequest(prompt, project.path);
      clearAnnotations();
      setAnnotateMode(false);
    },
    [createRequest, project.path, clearAnnotations]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="h-10 px-4 flex items-center border-b border-border-subtle bg-surface-0 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors mr-3"
        >
          <ChevronLeftIcon size={14} />
        </button>
        <span className="text-sm font-medium text-text-primary truncate">
          {project.name}
        </span>

        <div className="flex-1 mx-4">
          <DesignReplaySlider requests={requests} />
        </div>

        {/* Annotate toggle */}
        <button
          onClick={() => setAnnotateMode((p) => !p)}
          className={`mr-3 px-2 py-1 rounded-button text-xs transition-colors ${
            annotateMode
              ? 'bg-accent text-white'
              : 'text-text-tertiary hover:text-text-primary hover:bg-surface-2'
          }`}
        >
          Annotate
        </button>

        <ViewportSelector currentWidth={viewportWidth} onChangeWidth={setViewportWidth} />
      </div>

      {/* Three-column layout */}
      <Group orientation="horizontal" className="flex-1">
        {/* Left panel */}
        <Panel defaultSize={15} minSize={12} style={{ minWidth: 180 }}>
          <div className="flex flex-col h-full bg-surface-0 border-r border-border-subtle">
            <div className="text-sm font-semibold text-text-primary px-3 py-3">
              {project.name}
            </div>

            <PagesList projectPath={project.path} />

            <div className="border-t border-border-subtle my-2" />

            <div className="flex-1 overflow-hidden">
              <RequestQueue
                requests={requests}
                onApprove={approveRequest}
                onReject={rejectRequest}
                onCancel={cancelRequest}
              />
            </div>
          </div>
        </Panel>

        <Separator className="w-1 bg-border-subtle hover:bg-accent/40 transition-colors cursor-col-resize" />

        {/* Center panel — preview */}
        <Panel minSize={40}>
          <div className="relative h-full flex items-center justify-center bg-surface-2">
            <div
              className="relative h-full bg-surface-0 transition-all duration-300 overflow-hidden"
              style={{ width: viewportWidth, maxWidth: '100%' }}
            >
              <PreviewPanel projectPath={project.path} />

              <AnnotationOverlay
                isEnabled={annotateMode}
                onSubmitAll={handleAnnotationSubmit}
              />
            </div>

            <RequestBar
              onSubmit={handleSubmit}
              isProcessing={!!activeRequest}
              activeRequestPrompt={activeRequest?.prompt}
            />
          </div>
        </Panel>

        <Separator className="w-1 bg-border-subtle hover:bg-accent/40 transition-colors cursor-col-resize" />

        {/* Right panel — activity feed */}
        <Panel defaultSize={18} minSize={13} style={{ minWidth: 200 }}>
          <TranslatedFeed
            entries={feedEntries}
            isActive={!!activeRequest}
            onClear={clearFeed}
          />
        </Panel>
      </Group>
    </div>
  );
}
