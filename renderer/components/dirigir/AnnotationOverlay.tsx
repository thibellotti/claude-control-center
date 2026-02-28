import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAnnotations, Annotation } from '../../hooks/useAnnotations';

interface AnnotationOverlayProps {
  isEnabled: boolean;
  onSubmitAll: (prompt: string) => void;
}

// Individual annotation bubble component
function AnnotationBubble({
  annotation,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
}: {
  annotation: Annotation;
  index: number;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  const handleBubbleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(isSelected ? null : annotation.id);
    },
    [annotation.id, isSelected, onSelect]
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(annotation.id, { text: e.target.value });
    },
    [annotation.id, onUpdate]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove(annotation.id);
    },
    [annotation.id, onRemove]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSelect(null);
      }
    },
    [onSelect]
  );

  return (
    <div
      className="absolute"
      style={{
        left: `${annotation.x}%`,
        top: `${annotation.y}%`,
        transform: 'translate(-10px, -10px)',
      }}
    >
      {/* Numbered circle indicator */}
      <button
        onClick={handleBubbleClick}
        className={`
          flex items-center justify-center w-5 h-5 rounded-full
          text-micro font-medium text-white cursor-pointer
          transition-transform duration-150 select-none
          ${isSelected ? 'bg-accent-hover scale-110' : 'bg-accent hover:scale-110'}
        `}
      >
        {index + 1}
      </button>

      {/* Expanded input card */}
      {isSelected && (
        <div
          className="absolute top-6 left-0 bg-surface-1 border border-border-default rounded-card p-2 w-[200px] shadow-lg z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            ref={inputRef}
            value={annotation.text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe the change..."
            rows={3}
            className="w-full text-xs text-text-primary bg-surface-1 border border-border-default rounded-card p-2 resize-none outline-none focus:border-accent placeholder:text-text-tertiary"
          />
          <div className="flex items-center justify-between mt-1.5">
            <button
              onClick={handleDelete}
              className="text-micro text-feedback-error hover:underline cursor-pointer"
            >
              Delete
            </button>
            <span className="text-micro text-text-tertiary">
              {annotation.text.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Main overlay component
const AnnotationOverlay = React.memo(function AnnotationOverlay({
  isEnabled,
  onSubmitAll,
}: AnnotationOverlayProps) {
  const {
    annotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    clearAnnotations,
    buildPrompt,
  } = useAnnotations();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!overlayRef.current) return;

      // If clicking on an existing annotation, don't create a new one
      if (e.target !== e.currentTarget) return;

      const rect = overlayRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const newId = addAnnotation(x, y);
      setSelectedId(newId);
    },
    [addAnnotation]
  );

  const handleSubmitAll = useCallback(() => {
    const prompt = buildPrompt();
    if (prompt) {
      onSubmitAll(prompt);
      clearAnnotations();
      setSelectedId(null);
    }
  }, [buildPrompt, onSubmitAll, clearAnnotations]);

  const handleRemove = useCallback(
    (id: string) => {
      removeAnnotation(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
    },
    [removeAnnotation, selectedId]
  );

  const filledCount = annotations.filter((a) => a.text.trim()).length;

  if (!isEnabled) return null;

  return (
    <>
      {/* Overlay layer */}
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className="absolute inset-0 z-20 cursor-crosshair"
      >
        {annotations.map((annotation, index) => (
          <AnnotationBubble
            key={annotation.id}
            annotation={annotation}
            index={index}
            isSelected={selectedId === annotation.id}
            onSelect={setSelectedId}
            onUpdate={updateAnnotation}
            onRemove={handleRemove}
          />
        ))}
      </div>

      {/* Submit button — fixed at top-right when there are filled annotations */}
      {filledCount > 0 && (
        <button
          onClick={handleSubmitAll}
          className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-button text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer shadow-md"
        >
          Submit {filledCount} annotation{filledCount !== 1 ? 's' : ''}
        </button>
      )}
    </>
  );
});

export default AnnotationOverlay;
