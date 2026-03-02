import { log } from './logger';

type SecurityCategory = 'path-traversal' | 'command-injection' | 'auth' | 'encryption' | 'access-denied' | 'url-validation';
type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export function logSecurityEvent(
  category: SecurityCategory,
  severity: SecuritySeverity,
  message: string,
  details?: Record<string, unknown>
): void {
  const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
  log(level, `security:${category}`, `[${severity.toUpperCase()}] ${message}`, details);
}
