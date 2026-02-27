import { ipcMain } from 'electron';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { IPC_CHANNELS } from '../../shared/types';

export interface SupabaseInfo {
  hasSupabase: boolean;
  envVars: {
    hasUrl: boolean;
    hasAnonKey: boolean;
    hasServiceKey: boolean;
  };
  hasLocalConfig: boolean;
  projectUrl: string | null;
}

/**
 * Reads a package.json and checks whether @supabase/supabase-js is listed
 * as a dependency or devDependency.
 */
function checkPackageJsonForSupabase(projectPath: string): boolean {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!existsSync(pkgPath)) return false;

  try {
    const raw = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw);
    const deps = pkg.dependencies || {};
    const devDeps = pkg.devDependencies || {};
    return '@supabase/supabase-js' in deps || '@supabase/supabase-js' in devDeps;
  } catch {
    return false;
  }
}

/**
 * Scans common .env files for Supabase-related environment variables.
 * Returns which variables were found and the masked project URL if available.
 */
function scanEnvFiles(projectPath: string): {
  hasUrl: boolean;
  hasAnonKey: boolean;
  hasServiceKey: boolean;
  projectUrl: string | null;
} {
  const envFiles = ['.env', '.env.local', '.env.development', '.env.development.local'];
  let hasUrl = false;
  let hasAnonKey = false;
  let hasServiceKey = false;
  let projectUrl: string | null = null;

  for (const envFile of envFiles) {
    const envPath = path.join(projectPath, envFile);
    if (!existsSync(envPath)) continue;

    try {
      const content = readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Check for SUPABASE_URL (with optional NEXT_PUBLIC_ / VITE_ / REACT_APP_ prefix)
        if (/SUPABASE_URL\s*=/.test(trimmed)) {
          hasUrl = true;

          // Extract the URL value for hostname display
          const match = trimmed.match(/SUPABASE_URL\s*=\s*['"]?([^'"#\s]+)/);
          if (match && match[1] && !projectUrl) {
            try {
              const parsed = new URL(match[1]);
              // Show only the hostname (e.g. abc123.supabase.co)
              projectUrl = parsed.hostname;
            } catch {
              // If URL parsing fails, just mask it
              projectUrl = null;
            }
          }
        }

        // Check for SUPABASE_ANON_KEY
        if (/SUPABASE_ANON_KEY\s*=/.test(trimmed)) {
          hasAnonKey = true;
        }

        // Check for SUPABASE_SERVICE(_ROLE)?_KEY
        if (/SUPABASE_SERVICE.*KEY\s*=/.test(trimmed)) {
          hasServiceKey = true;
        }
      }
    } catch {
      // Ignore read errors on individual env files
    }
  }

  return { hasUrl, hasAnonKey, hasServiceKey, projectUrl };
}

export function registerSupabaseHandlers() {
  ipcMain.handle(
    IPC_CHANNELS.GET_SUPABASE_INFO,
    async (_event, projectPath: string): Promise<SupabaseInfo> => {
      const hasSupabase = checkPackageJsonForSupabase(projectPath);
      const envVars = scanEnvFiles(projectPath);
      const hasLocalConfig = existsSync(path.join(projectPath, 'supabase'));

      return {
        hasSupabase,
        envVars: {
          hasUrl: envVars.hasUrl,
          hasAnonKey: envVars.hasAnonKey,
          hasServiceKey: envVars.hasServiceKey,
        },
        hasLocalConfig,
        projectUrl: envVars.projectUrl,
      };
    }
  );
}
