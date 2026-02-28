import { promises as fs } from 'fs';

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Decodes Claude's encoded project path format.
 * Example: "-Users-thiagobellotti-Desktop-trade" -> "/Users/thiagobellotti/Desktop/trade"
 *
 * Uses a greedy longest-match strategy to handle hyphenated directory names.
 */
export async function decodeClaudePath(encoded: string): Promise<string> {
  const parts = encoded.slice(1).split('-');
  return reconstructPath('/', parts, 0);
}

async function reconstructPath(current: string, parts: string[], index: number): Promise<string> {
  if (index >= parts.length) return current;

  // Greedy: try longest segment first so hyphenated names are preferred
  for (let end = parts.length; end > index; end--) {
    const segment = parts.slice(index, end).join('-');
    const candidate = current === '/' ? `/${segment}` : `${current}/${segment}`;

    if (end === parts.length) {
      if (await pathExists(candidate)) return candidate;
    } else if (await pathExists(candidate)) {
      const result = await reconstructPath(candidate, parts, end);
      if (await pathExists(result)) return result;
    }
  }

  const fallback = '/' + parts.join('/');
  return fallback;
}
