import { useState, useCallback } from 'react';

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
  const [selectedFile, setSelectedFile] = useState<ClaudeMdFile | null>(null);
  const [content, setContent] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const scan = useCallback(async (projects: { path: string; name: string; client?: string | null }[]) => {
    setLoading(true);
    try {
      const result = await window.api.scanClaudeMd(projects);
      setTree(result);
    } catch (err) {
      console.error('Failed to scan CLAUDE.md files:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectFile = useCallback(async (file: ClaudeMdFile) => {
    setSelectedFile(file);
    try {
      const data = await window.api.readClaudeMd(file.path);
      setContent(data);
    } catch (err) {
      console.error('Failed to read CLAUDE.md:', err);
      setContent('');
    }
  }, []);

  const saveContent = useCallback(async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      await window.api.writeClaudeMd(selectedFile.path, content);
    } catch (err) {
      console.error('Failed to save CLAUDE.md:', err);
    } finally {
      setSaving(false);
    }
  }, [selectedFile, content]);

  return { tree, loading, selectedFile, content, saving, scan, selectFile, setContent, saveContent };
}
