import { ipcMain } from 'electron';
import { existsSync, promises as fs } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import simpleGit from 'simple-git';
import { IPC_CHANNELS } from '../../shared/types';
import type {
  ProjectHealthScore,
  ProjectCostSummary,
  ProjectIntelligence,
  DependencyAuditResult,
} from '../../shared/types';
import { log } from '../helpers/logger';
import { analyzeSessionIntel } from './session-intel';

// ---------------------------------------------------------------------------
// Health Score (0-100)
// ---------------------------------------------------------------------------

async function computeHealthScore(projectPath: string): Promise<ProjectHealthScore> {
  const details: string[] = [];
  let gitCleanliness = 25;
  let activityRecency = 0;
  let dependencyHealth = 25;
  let configQuality = 0;

  // --- Git Cleanliness (0-25) ---
  try {
    const git = simpleGit(projectPath);
    const isRepo = await git.checkIsRepo();

    if (isRepo) {
      const status = await git.status();

      // Uncommitted changes: -5 each
      const modified = status.modified.length + status.staged.length;
      if (modified > 0) {
        gitCleanliness -= Math.min(modified * 5, 15);
        details.push(`${modified} uncommitted change${modified !== 1 ? 's' : ''}`);
      }

      // Untracked files: -2 each, max -10
      if (status.not_added.length > 0) {
        gitCleanliness -= Math.min(status.not_added.length * 2, 10);
        details.push(`${status.not_added.length} untracked file${status.not_added.length !== 1 ? 's' : ''}`);
      }

      // Unpushed commits: -3 each
      if (status.ahead > 0) {
        gitCleanliness -= Math.min(status.ahead * 3, 10);
        details.push(`${status.ahead} unpushed commit${status.ahead !== 1 ? 's' : ''}`);
      }

      gitCleanliness = Math.max(0, gitCleanliness);

      // --- Activity Recency (0-25) ---
      try {
        const logResult = await git.log({ maxCount: 1 });
        if (logResult.latest) {
          const lastCommitDate = new Date(logResult.latest.date);
          const daysSince = (Date.now() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24);

          if (daysSince < 1) activityRecency = 25;
          else if (daysSince < 3) activityRecency = 20;
          else if (daysSince < 7) activityRecency = 15;
          else if (daysSince < 14) activityRecency = 10;
          else if (daysSince < 30) activityRecency = 5;
          else activityRecency = 0;

          if (daysSince >= 30) details.push(`Last commit ${Math.floor(daysSince)} days ago`);
        }
      } catch {
        // No commits yet
      }
    } else {
      gitCleanliness = 0;
      details.push('Not a git repository');
    }
  } catch {
    gitCleanliness = 0;
    details.push('Git not available');
  }

  // --- Dependency Health (0-25) ---
  const packageJsonPath = join(projectPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    dependencyHealth = 0;

    if (existsSync(join(projectPath, 'node_modules'))) {
      dependencyHealth += 10;
    } else {
      details.push('node_modules missing');
    }

    if (existsSync(join(projectPath, 'package-lock.json')) || existsSync(join(projectPath, 'yarn.lock')) || existsSync(join(projectPath, 'pnpm-lock.yaml')) || existsSync(join(projectPath, 'bun.lockb'))) {
      dependencyHealth += 5;
    } else {
      details.push('No lockfile found');
    }

    // Quick audit check (skip if no node_modules)
    if (existsSync(join(projectPath, 'node_modules'))) {
      try {
        execSync('npm audit --json 2>/dev/null', { cwd: projectPath, timeout: 10000 });
        dependencyHealth += 10;
      } catch (err: unknown) {
        // npm audit exits with non-zero when vulnerabilities found
        try {
          const errObj = err as { stdout?: Buffer };
          if (errObj.stdout) {
            const audit = JSON.parse(errObj.stdout.toString());
            const vulnCount = audit?.metadata?.vulnerabilities?.total || 0;
            if (vulnCount === 0) {
              dependencyHealth += 10;
            } else {
              details.push(`${vulnCount} dependency vulnerabilit${vulnCount !== 1 ? 'ies' : 'y'}`);
              // Give partial credit for low vulnerability count
              if (vulnCount <= 5) dependencyHealth += 5;
            }
          }
        } catch {
          // Audit parse failed, give partial credit
          dependencyHealth += 5;
        }
      }
    }
  }
  // If no package.json, keep the default 25

  // --- Config Quality (0-25) ---
  if (existsSync(join(projectPath, 'tsconfig.json'))) configQuality += 5;
  if (
    existsSync(join(projectPath, '.eslintrc')) ||
    existsSync(join(projectPath, '.eslintrc.js')) ||
    existsSync(join(projectPath, '.eslintrc.json')) ||
    existsSync(join(projectPath, '.eslintrc.cjs')) ||
    existsSync(join(projectPath, 'eslint.config.js')) ||
    existsSync(join(projectPath, 'eslint.config.mjs')) ||
    existsSync(join(projectPath, 'eslint.config.cjs'))
  ) {
    configQuality += 5;
  }
  if (
    existsSync(join(projectPath, '.github', 'workflows')) ||
    existsSync(join(projectPath, '.gitlab-ci.yml')) ||
    existsSync(join(projectPath, '.circleci'))
  ) {
    configQuality += 5;
  }
  if (
    existsSync(join(projectPath, 'tests')) ||
    existsSync(join(projectPath, '__tests__')) ||
    existsSync(join(projectPath, 'test'))
  ) {
    configQuality += 5;
  }
  if (existsSync(join(projectPath, 'CLAUDE.md'))) {
    configQuality += 5;
  }

  const overall = gitCleanliness + activityRecency + dependencyHealth + configQuality;

  return {
    overall,
    breakdown: {
      gitCleanliness,
      activityRecency,
      dependencyHealth,
      configQuality,
    },
    details,
  };
}

// ---------------------------------------------------------------------------
// Cost Tracking (delegates to session-intel for JSONL parsing)
// ---------------------------------------------------------------------------

async function computeCostSummary(projectPath: string): Promise<ProjectCostSummary> {
  const result: ProjectCostSummary = {
    last7Days: 0,
    last30Days: 0,
    allTime: 0,
    trend: 'stable',
  };

  try {
    const intel = await analyzeSessionIntel(projectPath);
    if (intel.sessions.length === 0) return result;

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let previousWeekCost = 0;

    for (const session of intel.sessions) {
      const sessionTime = session.startTime || session.endTime;
      result.allTime += session.estimatedCostUSD;

      if (sessionTime >= thirtyDaysAgo) {
        result.last30Days += session.estimatedCostUSD;
      }
      if (sessionTime >= sevenDaysAgo) {
        result.last7Days += session.estimatedCostUSD;
      }
      if (sessionTime >= fourteenDaysAgo && sessionTime < sevenDaysAgo) {
        previousWeekCost += session.estimatedCostUSD;
      }
    }

    // Determine trend
    if (result.last7Days > previousWeekCost * 1.2) {
      result.trend = 'increasing';
    } else if (result.last7Days < previousWeekCost * 0.8) {
      result.trend = 'decreasing';
    } else {
      result.trend = 'stable';
    }
  } catch (error: unknown) {
    log('warn', 'project-intel', `Failed to compute cost summary for ${projectPath}`, error);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Dependency Audit
// ---------------------------------------------------------------------------

// Simple in-memory cache for audit results
const auditCache = new Map<string, { result: DependencyAuditResult; timestamp: number }>();
const AUDIT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function runDependencyAudit(projectPath: string): Promise<DependencyAuditResult | null> {
  // Check cache first
  const cached = auditCache.get(projectPath);
  if (cached && Date.now() - cached.timestamp < AUDIT_CACHE_TTL) {
    return cached.result;
  }

  if (!existsSync(join(projectPath, 'package.json'))) return null;
  if (!existsSync(join(projectPath, 'node_modules'))) return null;

  try {
    // npm audit returns non-zero exit when vulnerabilities found
    let auditJson: string;
    try {
      auditJson = execSync('npm audit --json 2>/dev/null', {
        cwd: projectPath,
        timeout: 30000,
        encoding: 'utf-8',
      });
    } catch (err: unknown) {
      const errObj = err as { stdout?: string };
      if (errObj.stdout) {
        auditJson = errObj.stdout;
      } else {
        return null;
      }
    }

    const audit = JSON.parse(auditJson);
    const metadata = audit.metadata?.vulnerabilities || {};

    const vulnerabilities: DependencyAuditResult['vulnerabilities'] = [];

    // Parse advisories/vulnerabilities from npm audit output
    if (audit.vulnerabilities) {
      for (const [name, info] of Object.entries(audit.vulnerabilities)) {
        const vuln = info as { severity?: string; via?: Array<{ title?: string; url?: string }> | string[] };
        const title = Array.isArray(vuln.via) && vuln.via.length > 0 && typeof vuln.via[0] === 'object'
          ? (vuln.via[0] as { title?: string }).title || name
          : name;
        vulnerabilities.push({
          name,
          severity: vuln.severity || 'info',
          title,
          path: name,
        });
      }
    }

    const result: DependencyAuditResult = {
      critical: metadata.critical || 0,
      high: metadata.high || 0,
      moderate: metadata.moderate || 0,
      low: metadata.low || 0,
      total: metadata.total || 0,
      vulnerabilities: vulnerabilities.slice(0, 50),
      lastAuditTime: Date.now(),
    };

    auditCache.set(projectPath, { result, timestamp: Date.now() });
    return result;
  } catch (error: unknown) {
    log('warn', 'project-intel', `Dependency audit failed for ${projectPath}`, error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Project Type Detection + Agent Suggestions
// ---------------------------------------------------------------------------

interface TypeDetectionResult {
  projectType: string | null;
  suggestedAgents: string[];
}

async function detectProjectType(projectPath: string): Promise<TypeDetectionResult> {
  let projectType: string | null = null;
  const suggestedAgents: string[] = [];

  // Check package.json first
  const packageJsonPath = join(projectPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const raw = await fs.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(raw);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const depKeys = Object.keys(allDeps);

      if (depKeys.some((k) => k === 'next')) {
        projectType = 'Next.js';
        suggestedAgents.push('Code Reviewer', 'Test Writer', 'Performance Auditor');
      } else if (depKeys.some((k) => k === 'react')) {
        projectType = 'React';
        suggestedAgents.push('Code Reviewer', 'Test Writer', 'Accessibility Auditor');
      } else if (depKeys.some((k) => k === 'vue')) {
        projectType = 'Vue';
        suggestedAgents.push('Code Reviewer', 'Test Writer');
      } else if (depKeys.some((k) => k === 'svelte' || k === '@sveltejs/kit')) {
        projectType = 'Svelte';
        suggestedAgents.push('Code Reviewer', 'Test Writer');
      } else if (depKeys.some((k) => k === 'express' || k === 'fastify' || k === 'koa' || k === 'hono')) {
        projectType = 'Node API';
        suggestedAgents.push('Code Reviewer', 'API Test Writer', 'Security Auditor');
      } else if (depKeys.some((k) => k === 'electron')) {
        projectType = 'Electron';
        suggestedAgents.push('Code Reviewer', 'Test Writer');
      } else if (depKeys.some((k) => k === 'three')) {
        projectType = 'Three.js';
        suggestedAgents.push('Code Reviewer', 'Performance Auditor');
      }

      // TypeScript detection
      if (!projectType && depKeys.some((k) => k === 'typescript')) {
        projectType = 'TypeScript';
        suggestedAgents.push('Code Reviewer', 'Test Writer');
      }
    } catch {
      // Parse error
    }
  }

  // Check non-JS projects
  if (!projectType) {
    if (existsSync(join(projectPath, 'Cargo.toml'))) {
      projectType = 'Rust';
      suggestedAgents.push('Code Reviewer', 'Documentation');
    } else if (existsSync(join(projectPath, 'go.mod'))) {
      projectType = 'Go';
      suggestedAgents.push('Code Reviewer', 'Test Writer');
    } else if (existsSync(join(projectPath, 'pyproject.toml')) || existsSync(join(projectPath, 'requirements.txt'))) {
      projectType = 'Python';
      suggestedAgents.push('Code Reviewer', 'Documentation', 'Test Writer');
    }
  }

  // Default agents if we detected a type but no specific suggestions
  if (projectType && suggestedAgents.length === 0) {
    suggestedAgents.push('Code Reviewer');
  }

  return { projectType, suggestedAgents };
}

// ---------------------------------------------------------------------------
// Combined Intelligence
// ---------------------------------------------------------------------------

async function getProjectIntelligence(projectPath: string): Promise<ProjectIntelligence> {
  const [healthScore, costSummary, typeDetection] = await Promise.all([
    computeHealthScore(projectPath),
    computeCostSummary(projectPath),
    detectProjectType(projectPath),
  ]);

  // Use cached audit if available, don't run it automatically
  const cached = auditCache.get(projectPath);
  const dependencyAudit = cached && Date.now() - cached.timestamp < AUDIT_CACHE_TTL
    ? cached.result
    : null;

  return {
    healthScore,
    costSummary,
    dependencyAudit,
    suggestedAgents: typeDetection.suggestedAgents,
    projectType: typeDetection.projectType,
  };
}

// ---------------------------------------------------------------------------
// IPC Registration
// ---------------------------------------------------------------------------

export function registerProjectIntelHandlers() {
  ipcMain.handle(IPC_CHANNELS.PROJECT_INTEL_GET, async (_, projectPath: string) => {
    return getProjectIntelligence(projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_INTEL_AUDIT_DEPS, async (_, projectPath: string) => {
    return runDependencyAudit(projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_INTEL_DETECT_TYPE, async (_, projectPath: string) => {
    return detectProjectType(projectPath);
  });
}
