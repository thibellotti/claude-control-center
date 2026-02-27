import { existsSync } from 'fs';

/**
 * Decodes Claude's encoded project path format.
 * Example: "-Users-thiagobellotti-Desktop-trade" -> "/Users/thiagobellotti/Desktop/trade"
 */
export function decodeClaudePath(encoded: string): string {
  const parts = encoded.slice(1).split('-');
  return findValidPath(parts);
}

function findValidPath(parts: string[]): string {
  return reconstructPath('/', parts, 0);
}

function reconstructPath(current: string, parts: string[], index: number): string {
  if (index >= parts.length) return current;

  for (let end = index + 1; end <= parts.length; end++) {
    const segment = parts.slice(index, end).join('-');
    const candidate = current === '/' ? `/${segment}` : `${current}/${segment}`;

    if (end === parts.length) {
      if (existsSync(candidate)) return candidate;
    } else if (existsSync(candidate)) {
      const result = reconstructPath(candidate, parts, end);
      if (existsSync(result)) return result;
    }
  }

  const fallback = '/' + parts.join('/');
  return fallback;
}
