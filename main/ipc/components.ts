import { ipcMain } from 'electron';
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import path from 'path';
import { IPC_CHANNELS } from '../../shared/types';
import type { ComponentInfo, ComponentProp } from '../../shared/types';

// Directories to skip during scanning
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'out',
  '.cache',
  '.turbo',
  'coverage',
  '__snapshots__',
]);

// Maximum scan depth
const MAX_DEPTH = 5;

// Maximum number of files to scan
const MAX_FILES = 200;

// Maximum file size to parse (100KB)
const MAX_FILE_SIZE = 100 * 1024;

/**
 * Recursively collect .tsx and .jsx files from a directory.
 * Respects depth limit and file count cap.
 */
function collectComponentFiles(
  dir: string,
  depth: number,
  files: string[]
): void {
  if (depth > MAX_DEPTH || files.length >= MAX_FILES) return;

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (files.length >= MAX_FILES) return;

    const fullPath = path.join(dir, entry);

    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(entry) && !entry.startsWith('.')) {
        collectComponentFiles(fullPath, depth + 1, files);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(entry).toLowerCase();
      if ((ext === '.tsx' || ext === '.jsx') && stat.size <= MAX_FILE_SIZE) {
        // Skip test files, stories, and config files
        const name = entry.toLowerCase();
        if (
          name.includes('.test.') ||
          name.includes('.spec.') ||
          name.includes('.stories.') ||
          name.includes('.story.') ||
          name === 'setupTests.tsx' ||
          name === 'setuptests.tsx'
        ) {
          continue;
        }
        files.push(fullPath);
      }
    }
  }
}

/**
 * Check if a test file exists for a given component file.
 */
function hasTestFile(filePath: string): boolean {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);

  // Check for co-located test files
  const testPatterns = [
    `${baseName}.test${ext}`,
    `${baseName}.spec${ext}`,
    `${baseName}.test.tsx`,
    `${baseName}.spec.tsx`,
    `${baseName}.test.jsx`,
    `${baseName}.spec.jsx`,
    `${baseName}.test.ts`,
    `${baseName}.spec.ts`,
  ];

  for (const pattern of testPatterns) {
    if (existsSync(path.join(dir, pattern))) return true;
  }

  // Check __tests__ directory
  const testsDir = path.join(dir, '__tests__');
  if (existsSync(testsDir)) {
    for (const pattern of testPatterns) {
      if (existsSync(path.join(testsDir, pattern))) return true;
    }
  }

  return false;
}

/**
 * Parse props from an interface or type definition block.
 * Best-effort parsing, not a full TypeScript parser.
 */
function parsePropsFromBlock(block: string): ComponentProp[] {
  const props: ComponentProp[] = [];
  // Match lines like: propName: type; or propName?: type;
  const propRegex = /^\s*(\w+)(\?)?:\s*(.+?)\s*;?\s*$/gm;
  let match;

  while ((match = propRegex.exec(block)) !== null) {
    const name = match[1];
    const optional = !!match[2];
    let type = match[3];

    // Clean up the type string
    type = type.replace(/;$/, '').trim();

    // Skip common non-prop patterns
    if (name === 'children' && type === 'React.ReactNode') {
      props.push({ name, type, required: !optional });
      continue;
    }

    props.push({
      name,
      type,
      required: !optional,
    });
  }

  return props;
}

/**
 * Extract props for a component by looking for its Props interface/type.
 */
function extractProps(
  content: string,
  componentName: string
): ComponentProp[] {
  // Look for interface {ComponentName}Props { ... }
  // or type {ComponentName}Props = { ... }
  const propsName = `${componentName}Props`;

  // Try interface pattern
  const interfaceRegex = new RegExp(
    `interface\\s+${propsName}\\s*(?:extends\\s+[^{]+)?\\{([^}]*)\\}`,
    's'
  );
  const interfaceMatch = content.match(interfaceRegex);
  if (interfaceMatch) {
    return parsePropsFromBlock(interfaceMatch[1]);
  }

  // Try type pattern
  const typeRegex = new RegExp(
    `type\\s+${propsName}\\s*=\\s*\\{([^}]*)\\}`,
    's'
  );
  const typeMatch = content.match(typeRegex);
  if (typeMatch) {
    return parsePropsFromBlock(typeMatch[1]);
  }

  // Try inline props in function signature: function Component({ prop1, prop2 }: { ... })
  const inlineRegex = new RegExp(
    `function\\s+${componentName}\\s*\\([^)]*:\\s*\\{([^}]*)\\}`,
    's'
  );
  const inlineMatch = content.match(inlineRegex);
  if (inlineMatch) {
    return parsePropsFromBlock(inlineMatch[1]);
  }

  return [];
}

/**
 * Detect React component exports from file content.
 */
function detectComponents(
  content: string,
  filePath: string,
  projectPath: string
): ComponentInfo[] {
  const components: ComponentInfo[] = [];
  const relativePath = path.relative(projectPath, filePath);
  const directory = path.basename(path.dirname(filePath));
  const lineCount = content.split('\n').length;
  const hasTests = hasTestFile(filePath);

  // Pattern 1: export default function ComponentName
  const defaultFuncRegex =
    /export\s+default\s+function\s+([A-Z][a-zA-Z0-9]+)/g;
  let match;
  while ((match = defaultFuncRegex.exec(content)) !== null) {
    const name = match[1];
    components.push({
      name,
      filePath,
      relativePath,
      exportType: 'default',
      props: extractProps(content, name),
      lineCount,
      hasTests,
      directory,
    });
  }

  // Pattern 2: export default ComponentName (standalone, not function declaration)
  // Be careful not to double-match "export default function X"
  const defaultExportRegex =
    /export\s+default\s+([A-Z][a-zA-Z0-9]+)\s*;?\s*$/gm;
  while ((match = defaultExportRegex.exec(content)) !== null) {
    const name = match[1];
    // Skip if this is actually "export default function X"
    const lineStart = content.lastIndexOf('\n', match.index) + 1;
    const lineText = content.slice(lineStart, match.index + match[0].length);
    if (lineText.includes('function')) continue;

    // Skip if we already detected this component
    if (components.some((c) => c.name === name)) continue;

    components.push({
      name,
      filePath,
      relativePath,
      exportType: 'default',
      props: extractProps(content, name),
      lineCount,
      hasTests,
      directory,
    });
  }

  // Pattern 3: export function ComponentName (named export, PascalCase)
  const namedFuncRegex =
    /export\s+function\s+([A-Z][a-zA-Z0-9]+)/g;
  while ((match = namedFuncRegex.exec(content)) !== null) {
    const name = match[1];
    // Skip if already detected as default
    if (components.some((c) => c.name === name)) continue;

    components.push({
      name,
      filePath,
      relativePath,
      exportType: 'named',
      props: extractProps(content, name),
      lineCount,
      hasTests,
      directory,
    });
  }

  // Pattern 4: export const ComponentName = ... (PascalCase, arrow function or React.memo, etc.)
  const namedConstRegex =
    /export\s+const\s+([A-Z][a-zA-Z0-9]+)\s*[=:]/g;
  while ((match = namedConstRegex.exec(content)) !== null) {
    const name = match[1];
    // Skip if already detected
    if (components.some((c) => c.name === name)) continue;

    components.push({
      name,
      filePath,
      relativePath,
      exportType: 'named',
      props: extractProps(content, name),
      lineCount,
      hasTests,
      directory,
    });
  }

  return components;
}

export function registerComponentHandlers() {
  ipcMain.handle(
    IPC_CHANNELS.SCAN_COMPONENTS,
    async (_, projectPath: string): Promise<ComponentInfo[]> => {
      try {
        if (!existsSync(projectPath)) {
          return [];
        }

        // Collect all eligible files
        const files: string[] = [];
        collectComponentFiles(projectPath, 0, files);

        // Parse each file for components
        const allComponents: ComponentInfo[] = [];

        for (const filePath of files) {
          try {
            const content = readFileSync(filePath, 'utf-8');
            const components = detectComponents(content, filePath, projectPath);
            allComponents.push(...components);
          } catch {
            // Skip files we can't read
            continue;
          }
        }

        // Sort by directory, then name
        allComponents.sort((a, b) => {
          if (a.directory !== b.directory) {
            return a.directory.localeCompare(b.directory);
          }
          return a.name.localeCompare(b.name);
        });

        return allComponents;
      } catch (err) {
        console.error('Failed to scan components:', err);
        return [];
      }
    }
  );
}
