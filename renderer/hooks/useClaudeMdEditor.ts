import { useState, useEffect, useCallback, useRef } from 'react';
import type { ClaudeMdBlock } from '../../shared/types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Parse a markdown string into an array of ClaudeMdBlock.
// The parser recognizes headings (# to ####), horizontal rules (---),
// fenced code blocks (```), list items (- ), and plain text paragraphs.
function parseMarkdown(md: string): ClaudeMdBlock[] {
  const blocks: ClaudeMdBlock[] = [];
  const lines = md.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const codeMatch = line.match(/^```(\w*)$/);
    if (codeMatch) {
      const language = codeMatch[1] || '';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```$/)) {
        codeLines.push(lines[i]);
        i++;
      }
      // Skip the closing ```
      if (i < lines.length) i++;
      blocks.push({
        id: generateId(),
        type: 'code',
        content: codeLines.join('\n'),
        language,
      });
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      blocks.push({
        id: generateId(),
        type: 'rule',
        content: '',
      });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        id: generateId(),
        type: 'heading',
        content: headingMatch[2],
        level: headingMatch[1].length,
      });
      i++;
      continue;
    }

    // List: collect consecutive lines starting with "- "
    if (line.match(/^- /)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^- /)) {
        listItems.push(lines[i].replace(/^- /, ''));
        i++;
      }
      blocks.push({
        id: generateId(),
        type: 'list',
        content: listItems.join('\n'),
      });
      continue;
    }

    // Empty lines: skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Plain text paragraph: collect consecutive non-empty, non-special lines
    const textLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^#{1,4}\s/) &&
      !lines[i].match(/^---+$/) &&
      !lines[i].match(/^```/) &&
      !lines[i].match(/^- /)
    ) {
      textLines.push(lines[i]);
      i++;
    }
    if (textLines.length > 0) {
      blocks.push({
        id: generateId(),
        type: 'text',
        content: textLines.join('\n'),
      });
    }
  }

  return blocks;
}

// Serialize blocks back into a markdown string.
function serializeBlocks(blocks: ClaudeMdBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const hashes = '#'.repeat(block.level || 1);
        parts.push(`${hashes} ${block.content}`);
        break;
      }
      case 'rule':
        parts.push('---');
        break;
      case 'text':
        parts.push(block.content);
        break;
      case 'list': {
        const items = block.content.split('\n').filter((item) => item.length > 0);
        parts.push(items.map((item) => `- ${item}`).join('\n'));
        break;
      }
      case 'code': {
        const lang = block.language || '';
        parts.push(`\`\`\`${lang}\n${block.content}\n\`\`\``);
        break;
      }
    }
  }

  return parts.join('\n\n') + '\n';
}

export function useClaudeMdEditor(filePath: string | null) {
  const [blocks, setBlocks] = useState<ClaudeMdBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileExists, setFileExists] = useState(true);

  // Keep a ref to the saved content to detect changes
  const savedContentRef = useRef<string>('');

  // Load the file content
  useEffect(() => {
    if (!filePath) return;

    setIsLoading(true);
    setError(null);

    window.api
      .readFile(filePath)
      .then((content: string | null) => {
        if (content === null) {
          setFileExists(false);
          setBlocks([]);
          savedContentRef.current = '';
        } else {
          setFileExists(true);
          const parsed = parseMarkdown(content);
          setBlocks(parsed);
          savedContentRef.current = content;
        }
        setIsDirty(false);
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to load file');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [filePath]);

  const addBlock = useCallback((type: ClaudeMdBlock['type'], index?: number) => {
    const newBlock: ClaudeMdBlock = {
      id: generateId(),
      type,
      content: '',
      level: type === 'heading' ? 2 : undefined,
      language: type === 'code' ? '' : undefined,
    };

    setBlocks((prev) => {
      if (index !== undefined && index >= 0 && index <= prev.length) {
        const next = [...prev];
        next.splice(index, 0, newBlock);
        return next;
      }
      return [...prev, newBlock];
    });
    setIsDirty(true);
  }, []);

  const updateBlock = useCallback((id: string, updates: Partial<ClaudeMdBlock>) => {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, ...updates } : block))
    );
    setIsDirty(true);
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
    setIsDirty(true);
  }, []);

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;

      const next = [...prev];
      const [removed] = next.splice(idx, 1);
      next.splice(targetIdx, 0, removed);
      return next;
    });
    setIsDirty(true);
  }, []);

  const save = useCallback(async () => {
    if (!filePath) return;

    setError(null);
    try {
      const content = serializeBlocks(blocks);
      await window.api.writeFile(filePath, content);
      savedContentRef.current = content;
      setIsDirty(false);
      setFileExists(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save file';
      setError(message);
      throw err;
    }
  }, [filePath, blocks]);

  const createFile = useCallback(async () => {
    if (!filePath) return;

    setError(null);
    try {
      const defaultContent = '# CLAUDE.md\n\n';
      await window.api.writeFile(filePath, defaultContent);
      const parsed = parseMarkdown(defaultContent);
      setBlocks(parsed);
      savedContentRef.current = defaultContent;
      setFileExists(true);
      setIsDirty(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create file';
      setError(message);
    }
  }, [filePath]);

  // Get the current serialized markdown for raw view
  const getRawContent = useCallback(() => {
    return serializeBlocks(blocks);
  }, [blocks]);

  return {
    blocks,
    addBlock,
    updateBlock,
    removeBlock,
    moveBlock,
    save,
    createFile,
    isDirty,
    isLoading,
    error,
    fileExists,
    getRawContent,
  };
}
