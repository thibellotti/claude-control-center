import React, { useEffect } from 'react';
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

export default function VisualEditorPage({ projectPath, previewUrl, onExit }: VisualEditorPageProps) {
  const editor = useVisualEditor(projectPath, previewUrl);

  // Auto-activate on mount
  useEffect(() => {
    editor.activate();
    return () => { editor.deactivate(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-0">
      {/* Toolbar */}
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

      {/* Main content: Canvas (65%) + Inspector (35%) */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas area */}
        <div className="flex-[65] min-w-0">
          <Canvas
            previewUrl={previewUrl}
            viewport={editor.viewport}
            overlayScript={editor.overlayScript}
            onOverlayMessage={editor.handleOverlayMessage}
          />
        </div>

        {/* Inspector + PromptInput */}
        <div className="flex-[35] min-w-0 border-l border-border-subtle bg-surface-1 flex flex-col overflow-hidden">
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
      </div>

      {/* Status Bar */}
      <StatusBar
        isApplying={editor.isApplying}
        lastError={editor.lastError}
        selectedElement={editor.selectedElement}
      />
    </div>
  );
}
