import { useState, useCallback } from 'react';

export interface Annotation {
  id: string;
  x: number; // percentage of container width
  y: number; // percentage of container height
  text: string;
  elementSelector?: string;
  figmaLink?: string;
}

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const addAnnotation = useCallback((x: number, y: number) => {
    const annotation: Annotation = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x,
      y,
      text: '',
    };
    setAnnotations((prev) => [...prev, annotation]);
    return annotation.id;
  }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
  }, []);

  // Build a combined prompt from all annotations
  const buildPrompt = useCallback(() => {
    if (annotations.length === 0) return '';
    return annotations
      .filter((a) => a.text.trim())
      .map((a, i) => `${i + 1}. ${a.text}`)
      .join('\n');
  }, [annotations]);

  return {
    annotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    clearAnnotations,
    buildPrompt,
  };
}
