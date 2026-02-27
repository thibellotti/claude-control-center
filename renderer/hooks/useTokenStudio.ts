import { useState, useEffect, useCallback, useRef } from 'react';
import type { DesignTokens } from '../../shared/types';

// Parse a JS/TS object literal block from config content.
// Searches for `key: {` and collects everything until the matching `}`.
function extractObjectBlock(content: string, key: string): string | null {
  // Match both `key: {` and `key:{` patterns
  const regex = new RegExp(`(?:^|\\s|,)${key}\\s*:\\s*\\{`, 'm');
  const match = content.match(regex);
  if (!match || match.index === undefined) return null;

  const startIdx = content.indexOf('{', match.index + key.length);
  if (startIdx === -1) return null;

  let depth = 1;
  let i = startIdx + 1;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') depth--;
    i++;
  }

  return content.slice(startIdx + 1, i - 1);
}

// Parse a simple JS object literal string into key/value pairs.
// Handles nested objects, string values (single/double quoted), and template literals.
function parseSimpleObject(
  str: string
): Record<string, string | Record<string, string>> {
  const result: Record<string, string | Record<string, string>> = {};
  let i = 0;
  const s = str.trim();

  function skipWhitespaceAndComments() {
    while (i < s.length) {
      if (/\s/.test(s[i])) {
        i++;
      } else if (s[i] === '/' && s[i + 1] === '/') {
        // Line comment
        while (i < s.length && s[i] !== '\n') i++;
      } else if (s[i] === '/' && s[i + 1] === '*') {
        // Block comment
        i += 2;
        while (i < s.length - 1 && !(s[i] === '*' && s[i + 1] === '/')) i++;
        i += 2;
      } else {
        break;
      }
    }
  }

  function readKey(): string | null {
    skipWhitespaceAndComments();
    if (i >= s.length) return null;

    // Quoted key
    if (s[i] === "'" || s[i] === '"') {
      const quote = s[i];
      i++;
      let key = '';
      while (i < s.length && s[i] !== quote) {
        key += s[i];
        i++;
      }
      i++; // skip closing quote
      return key;
    }

    // Unquoted key (identifier, number, or DEFAULT)
    let key = '';
    while (i < s.length && /[a-zA-Z0-9_$-]/.test(s[i])) {
      key += s[i];
      i++;
    }
    return key || null;
  }

  function readValue(): string | Record<string, string> | null {
    skipWhitespaceAndComments();
    if (i >= s.length) return null;

    // Nested object
    if (s[i] === '{') {
      i++; // skip {
      const nested: Record<string, string> = {};
      while (i < s.length) {
        skipWhitespaceAndComments();
        if (s[i] === '}') {
          i++;
          return nested;
        }
        if (s[i] === ',') {
          i++;
          continue;
        }
        const nKey = readKey();
        if (!nKey) break;
        skipWhitespaceAndComments();
        if (s[i] === ':') i++;
        skipWhitespaceAndComments();
        const nVal = readStringValue();
        if (nVal !== null) {
          nested[nKey] = nVal;
        }
        skipWhitespaceAndComments();
        if (s[i] === ',') i++;
      }
      return nested;
    }

    return readStringValue();
  }

  function readStringValue(): string | null {
    skipWhitespaceAndComments();
    if (i >= s.length) return null;

    // String value
    if (s[i] === "'" || s[i] === '"') {
      const quote = s[i];
      i++;
      let val = '';
      while (i < s.length && s[i] !== quote) {
        if (s[i] === '\\') {
          i++;
          val += s[i] || '';
        } else {
          val += s[i];
        }
        i++;
      }
      i++; // skip closing quote
      return val;
    }

    // Template literal
    if (s[i] === '`') {
      i++;
      let val = '';
      while (i < s.length && s[i] !== '`') {
        val += s[i];
        i++;
      }
      i++;
      return val;
    }

    // Array value (for fontFamily): read until , or }
    if (s[i] === '[') {
      let depth = 1;
      let val = '[';
      i++;
      while (i < s.length && depth > 0) {
        if (s[i] === '[') depth++;
        if (s[i] === ']') depth--;
        val += s[i];
        i++;
      }
      return val;
    }

    // Bare value (number, variable reference, etc.)
    let val = '';
    while (i < s.length && s[i] !== ',' && s[i] !== '}' && s[i] !== '\n') {
      val += s[i];
      i++;
    }
    return val.trim() || null;
  }

  while (i < s.length) {
    skipWhitespaceAndComments();
    if (i >= s.length) break;
    if (s[i] === ',' || s[i] === '}') {
      i++;
      continue;
    }

    const key = readKey();
    if (!key) break;

    skipWhitespaceAndComments();
    if (s[i] === ':') i++;

    const value = readValue();
    if (value !== null) {
      result[key] = value;
    }

    skipWhitespaceAndComments();
    if (s[i] === ',') i++;
  }

  return result;
}

// Parse array strings like ['Inter', 'sans-serif'] into string arrays
function parseArrayString(str: string): string[] {
  const items: string[] = [];
  const regex = /['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(str)) !== null) {
    items.push(m[1]);
  }
  return items;
}

// Parse flat string record from object block
function parseFlatObject(content: string, key: string): Record<string, string> {
  const block = extractObjectBlock(content, key);
  if (!block) return {};

  const parsed = parseSimpleObject(block);
  const result: Record<string, string> = {};

  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === 'string') {
      result[k] = v;
    }
  }

  return result;
}

// Detect whether the config uses theme or theme.extend
function findThemeSection(content: string): string {
  // Check for theme.extend first
  const extendBlock = extractObjectBlock(content, 'extend');
  if (extendBlock) return 'extend';
  return 'theme';
}

export function useTokenStudio(projectPath: string | null) {
  const [tokens, setTokens] = useState<DesignTokens | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileExists, setFileExists] = useState(false);
  const [configFileName, setConfigFileName] = useState<string>('tailwind.config.js');

  const rawContentRef = useRef<string>('');

  // Find and load the tailwind config
  useEffect(() => {
    if (!projectPath) return;

    setIsLoading(true);
    setError(null);

    async function loadConfig() {
      // Try .js then .ts
      const candidates = ['tailwind.config.js', 'tailwind.config.ts'];
      let content: string | null = null;
      let foundName = '';

      for (const name of candidates) {
        const filePath = `${projectPath}/${name}`;
        try {
          const result = await window.api.readFile(filePath);
          if (result !== null) {
            content = result;
            foundName = name;
            break;
          }
        } catch {
          // File doesn't exist, try next
        }
      }

      if (content === null) {
        setFileExists(false);
        setTokens(null);
        setIsLoading(false);
        return;
      }

      setFileExists(true);
      setConfigFileName(foundName);
      rawContentRef.current = content;

      try {
        const parsed = parseConfig(content);
        setTokens(parsed);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to parse config';
        setError(message);
        // Still provide raw content for the raw editor
        setTokens({
          colors: {},
          spacing: {},
          fontFamily: {},
          fontSize: {},
          borderRadius: {},
          raw: content,
        });
      }

      setIsDirty(false);
      setIsLoading(false);
    }

    loadConfig();
  }, [projectPath]);

  function parseConfig(content: string): DesignTokens {
    // Determine section: try extend first, then theme root
    const section = findThemeSection(content);
    const themeContent =
      section === 'extend'
        ? extractObjectBlock(content, 'extend') || content
        : extractObjectBlock(content, 'theme') || content;

    // Parse colors
    const colorsBlock = extractObjectBlock(themeContent, 'colors');
    const colors = colorsBlock
      ? (parseSimpleObject(colorsBlock) as Record<string, string | Record<string, string>>)
      : {};

    // Parse spacing
    const spacing = parseFlatObject(themeContent, 'spacing');

    // Parse fontFamily
    const fontFamilyBlock = extractObjectBlock(themeContent, 'fontFamily');
    const fontFamily: Record<string, string[]> = {};
    if (fontFamilyBlock) {
      const parsed = parseSimpleObject(fontFamilyBlock);
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string' && value.startsWith('[')) {
          fontFamily[key] = parseArrayString(value);
        } else if (typeof value === 'string') {
          fontFamily[key] = [value];
        }
      }
    }

    // Parse fontSize
    const fontSizeBlock = extractObjectBlock(themeContent, 'fontSize');
    const fontSize: Record<string, string | [string, { lineHeight?: string }]> = {};
    if (fontSizeBlock) {
      const parsed = parseSimpleObject(fontSizeBlock);
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string') {
          fontSize[key] = value;
        }
      }
    }

    // Parse borderRadius
    const borderRadius = parseFlatObject(themeContent, 'borderRadius');

    return {
      colors,
      spacing,
      fontFamily,
      fontSize,
      borderRadius,
      raw: content,
    };
  }

  const updateColor = useCallback(
    (path: string, value: string) => {
      if (!tokens) return;

      const parts = path.split('.');
      const newColors = { ...tokens.colors };

      if (parts.length === 1) {
        newColors[parts[0]] = value;
      } else if (parts.length === 2) {
        const group = newColors[parts[0]];
        if (typeof group === 'object') {
          newColors[parts[0]] = { ...group, [parts[1]]: value };
        }
      }

      setTokens({ ...tokens, colors: newColors });
      setIsDirty(true);
    },
    [tokens]
  );

  const updateSpacing = useCallback(
    (key: string, value: string) => {
      if (!tokens) return;
      setTokens({
        ...tokens,
        spacing: { ...tokens.spacing, [key]: value },
      });
      setIsDirty(true);
    },
    [tokens]
  );

  const updateBorderRadius = useCallback(
    (key: string, value: string) => {
      if (!tokens) return;
      setTokens({
        ...tokens,
        borderRadius: { ...tokens.borderRadius, [key]: value },
      });
      setIsDirty(true);
    },
    [tokens]
  );

  const updateRaw = useCallback(
    (content: string) => {
      if (!tokens) return;
      setTokens({ ...tokens, raw: content });
      setIsDirty(true);
    },
    [tokens]
  );

  const save = useCallback(async () => {
    if (!projectPath || !tokens) return;

    setError(null);
    const filePath = `${projectPath}/${configFileName}`;

    try {
      // If the raw content was edited directly, write it as-is
      const content = tokens.raw;

      // Reconstruct the config from tokens by updating individual values
      // in the raw content. For v1, we write the raw content directly
      // and re-parse to sync state.
      let updatedContent = rawContentRef.current;

      // Update colors in the raw config string
      for (const [group, value] of Object.entries(tokens.colors)) {
        if (typeof value === 'string') {
          // Simple color value - find and replace
          const regex = new RegExp(
            `(${escapeRegex(group)}\\s*:\\s*)(['"\`])([^'"\`]*)\\2`,
            'g'
          );
          updatedContent = updatedContent.replace(regex, `$1'${value}'`);
        } else if (typeof value === 'object') {
          for (const [subKey, subValue] of Object.entries(value)) {
            const regex = new RegExp(
              `(${escapeRegex(subKey)}\\s*:\\s*)(['"\`])([^'"\`]*)\\2`
            );
            // Only replace within the right group context
            const groupBlock = extractObjectBlock(updatedContent, group);
            if (groupBlock) {
              const newBlock = groupBlock.replace(regex, `$1'${subValue}'`);
              updatedContent = updatedContent.replace(groupBlock, newBlock);
            }
          }
        }
      }

      // If the user edited raw content directly, prefer that
      const finalContent =
        content !== rawContentRef.current ? content : updatedContent;

      await window.api.writeFile(filePath, finalContent);
      rawContentRef.current = finalContent;
      setIsDirty(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save config';
      setError(message);
      throw err;
    }
  }, [projectPath, tokens, configFileName]);

  return {
    tokens,
    isLoading,
    isDirty,
    error,
    fileExists,
    configFileName,
    updateColor,
    updateSpacing,
    updateBorderRadius,
    updateRaw,
    save,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
