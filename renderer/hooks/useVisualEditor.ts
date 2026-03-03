import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  SelectedElement,
  VisualAction,
  VisualCheckpoint,
  TranslatedFeedEntry,
} from '../../shared/types';

export function useVisualEditor(projectPath: string, _previewUrl: string | null) {
  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  const [active, setActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [checkpoints, setCheckpoints] = useState<VisualCheckpoint[]>([]);
  const [undoIndex, setUndoIndex] = useState(-1);
  const [isApplying, setIsApplying] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [viewport, setViewportState] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [feedEntries, setFeedEntries] = useState<TranslatedFeedEntry[]>([]);

  // State for overlay script
  const [overlayScript, setOverlayScript] = useState<string | null>(null);

  // Snapshot refs for use inside callbacks that must not re-create on every state change
  const undoIndexRef = useRef(undoIndex);
  undoIndexRef.current = undoIndex;

  const selectedElementRef = useRef(selectedElement);
  selectedElementRef.current = selectedElement;

  const checkpointsRef = useRef(checkpoints);
  checkpointsRef.current = checkpoints;

  const isApplyingRef = useRef(isApplying);
  isApplyingRef.current = isApplying;

  // -----------------------------------------------------------------------
  // activate
  // -----------------------------------------------------------------------
  const activate = useCallback(async () => {
    try {
      const result = await window.api.visualEditorInject(projectPath);
      if ('error' in result && result.error) {
        setLastError(result.error as string);
        return;
      }
      setOverlayScript((result as { script: string }).script);
      setActive(true);
      setLastError(null);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Failed to activate');
    }
  }, [projectPath]);

  // -----------------------------------------------------------------------
  // deactivate
  // -----------------------------------------------------------------------
  const deactivate = useCallback(() => {
    setActive(false);
    setSelectedElement(null);
    setCheckpoints([]);
    setUndoIndex(-1);
    setIsApplying(false);
    setLastError(null);
    setFeedEntries([]);
    setOverlayScript(null);
  }, []);

  // -----------------------------------------------------------------------
  // executeAction
  // -----------------------------------------------------------------------
  const executeAction = useCallback(async (action: VisualAction) => {
    setIsApplying(true);
    setLastError(null);

    const checkpointId = crypto.randomUUID();

    try {
      const result = await window.api.visualEditorExecute({
        projectPath,
        action,
        checkpointId,
      });

      if (result.error) {
        setLastError(result.error as string);
      } else {
        const checkpoint: VisualCheckpoint = {
          id: checkpointId,
          timestamp: Date.now(),
          action,
          stashRef: (result.checkpointId as string) || checkpointId,
          status: 'applied',
        };
        setCheckpoints(prev => {
          const truncated = prev.slice(0, undoIndexRef.current + 1);
          return [...truncated, checkpoint];
        });
        setUndoIndex(prev => prev + 1);
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsApplying(false);
    }
  }, [projectPath]);

  // -----------------------------------------------------------------------
  // handleOverlayMessage
  // -----------------------------------------------------------------------
  const handleOverlayMessage = useCallback((event: MessageEvent) => {
    const data = event.data;
    if (!data || typeof data.type !== 'string') return;

    if (data.type === 'forma:select') {
      setSelectedElement(data.payload as SelectedElement);
    }

    if (data.type === 'forma:reorder') {
      const current = selectedElementRef.current;
      if (!current) return;
      const action: VisualAction = {
        id: crypto.randomUUID(),
        type: 'reorder',
        element: current,
        targetSelector: data.payload.targetSelector,
        position: data.payload.position,
      };
      executeAction(action);
    }
  }, [executeAction]);

  // -----------------------------------------------------------------------
  // undo
  // -----------------------------------------------------------------------
  const undo = useCallback(async () => {
    if (undoIndexRef.current < 0 || isApplyingRef.current) return;

    setIsApplying(true);
    try {
      const result = await window.api.visualEditorUndo(projectPath);
      if (result.success) {
        setCheckpoints(prev => {
          const updated = [...prev];
          const idx = undoIndexRef.current;
          updated[idx] = { ...updated[idx], status: 'undone' };
          return updated;
        });
        setUndoIndex(prev => prev - 1);
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Undo failed');
    } finally {
      setIsApplying(false);
    }
  }, [projectPath]);

  // -----------------------------------------------------------------------
  // redo
  // -----------------------------------------------------------------------
  const redo = useCallback(async () => {
    const nextIdx = undoIndexRef.current + 1;
    if (nextIdx >= checkpointsRef.current.length || isApplyingRef.current) return;

    const nextCheckpoint = checkpointsRef.current[nextIdx];
    setIsApplying(true);
    try {
      const result = await window.api.visualEditorRedo(projectPath, nextCheckpoint.action);
      if (result.success) {
        setCheckpoints(prev => {
          const updated = [...prev];
          updated[nextIdx] = { ...updated[nextIdx], status: 'applied' };
          return updated;
        });
        setUndoIndex(prev => prev + 1);
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Redo failed');
    } finally {
      setIsApplying(false);
    }
  }, [projectPath]);

  // -----------------------------------------------------------------------
  // Feed listener — only active when Visual Editor is on
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!active) return;

    const unsub = window.api.onRequestFeedUpdate((entry: unknown) => {
      const feedEntry = entry as TranslatedFeedEntry;
      setFeedEntries(prev => [...prev, feedEntry].slice(-100));
    });
    return unsub;
  }, [active]);

  // -----------------------------------------------------------------------
  // Return
  // -----------------------------------------------------------------------
  return {
    // State
    active,
    selectedElement,
    checkpoints,
    undoIndex,
    isApplying,
    lastError,
    viewport,
    feedEntries,
    overlayScript,

    // Methods
    activate,
    deactivate,
    handleOverlayMessage,
    executeAction,
    undo,
    redo,
    setViewport: setViewportState,
    clearError: () => setLastError(null),

    // Derived
    canUndo: undoIndex >= 0 && !isApplying,
    canRedo: undoIndex < checkpoints.length - 1 && !isApplying,
    checkpointCount: checkpoints.length,
  };
}
