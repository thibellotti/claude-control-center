import { useState, useCallback, useRef, useEffect } from 'react';

interface ClaudeMdFile {
  path: string;
  projectPath: string;
  projectName: string;
  clientName: string | null;
  lastModified: number;
}

interface ClaudeMdTree {
  byClient: Record<string, ClaudeMdFile[]>;
}

export function useClaudeMd() {
  const [tree, setTree] = useState<ClaudeMdTree>({ byClient: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ClaudeMdFile | null>(null);
  const [content, setContent] = useState<string>('');
  const [savedContent, setSavedContent] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Keep a ref to content so saveContent doesn't need content in its dep array
  const contentRef = useRef(content);
  useEffect(() => { contentRef.current = content; }, [content]);

  const scan = useCallback(async (projects: { path: string; name: string; client?: string | null }[]) => {
    setLoading(true);
    try {
      const result = await window.api.scanClaudeMd(projects);
      setTree(result);
      setError(null);
    } catch (err) {
      console.error('Failed to scan CLAUDE.md files:', err);
      setError('Failed to scan CLAUDE.md files');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectFile = useCallback(async (file: ClaudeMdFile) => {
    setSelectedFile(file);
    try {
      const data = await window.api.readClaudeMd(file.path);
      setContent(data);
      setSavedContent(data);
      setError(null);
    } catch (err) {
      console.error('Failed to read CLAUDE.md:', err);
      setContent('');
      setError('Failed to read CLAUDE.md');
    }
  }, []);

  const saveContent = useCallback(async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      await window.api.writeClaudeMd(selectedFile.path, contentRef.current);
      setSavedContent(contentRef.current);
      setError(null);
    } catch (err) {
      console.error('Failed to save CLAUDE.md:', err);
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  }, [selectedFile]);

  return { tree, loading, error, selectedFile, content, savedContent, saving, scan, selectFile, setContent, saveContent };
}
