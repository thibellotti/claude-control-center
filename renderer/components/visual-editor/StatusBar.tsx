import React, { useState, useEffect, useRef } from 'react';
import type { SelectedElement } from '../../../shared/types';

interface StatusBarProps {
  isApplying: boolean;
  lastError: string | null;
  selectedElement: SelectedElement | null;
}

export default function StatusBar({ isApplying, lastError, selectedElement }: StatusBarProps) {
  // Track elapsed time during apply
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  // Track "just completed" state for success message
  const [showSuccess, setShowSuccess] = useState(false);
  const wasApplyingRef = useRef(false);

  // Elapsed timer while applying
  useEffect(() => {
    if (isApplying) {
      startTimeRef.current = Date.now();
      setElapsedMs(0);
      const interval = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedMs(Date.now() - startTimeRef.current);
        }
      }, 100);
      return () => clearInterval(interval);
    } else {
      startTimeRef.current = null;
    }
  }, [isApplying]);

  // Detect transition from applying -> done (success flash)
  useEffect(() => {
    if (wasApplyingRef.current && !isApplying && !lastError) {
      setShowSuccess(true);
      const timeout = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timeout);
    }
    wasApplyingRef.current = isApplying;
  }, [isApplying, lastError]);

  // Format elapsed time
  const elapsed = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-surface-1 border-t border-border-subtle shrink-0 h-8">
      {/* Status indicator dot */}
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        isApplying ? 'bg-accent animate-pulse' :
        lastError ? 'bg-feedback-error' :
        showSuccess ? 'bg-feedback-success' :
        selectedElement ? 'bg-status-active' :
        'bg-text-tertiary'
      }`} />

      {/* Status text */}
      <span className={`text-xs truncate ${
        isApplying ? 'text-accent' :
        lastError ? 'text-feedback-error' :
        showSuccess ? 'text-feedback-success' :
        'text-text-tertiary'
      }`}>
        {isApplying && (
          <>
            Applying changes
            {selectedElement?.reactComponent && ` to ${selectedElement.reactComponent}`}
            ... ({elapsed}s)
          </>
        )}
        {!isApplying && lastError && lastError}
        {!isApplying && !lastError && showSuccess && 'Applied — change complete'}
        {!isApplying && !lastError && !showSuccess && selectedElement && (
          <>
            Selected: {'<'}{selectedElement.reactComponent || selectedElement.tagName}{'>'}
            {selectedElement.sourceFile && (
              <> in {selectedElement.sourceFile.split('/').pop()}</>
            )}
          </>
        )}
        {!isApplying && !lastError && !showSuccess && !selectedElement && (
          'Ready — Click an element to start editing'
        )}
      </span>
    </div>
  );
}
