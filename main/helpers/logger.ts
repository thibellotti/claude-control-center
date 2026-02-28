type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const CONSOLE_METHOD: Record<LogLevel, 'log' | 'info' | 'warn' | 'error'> = {
  debug: 'log',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

export function log(level: LogLevel, context: string, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
  const method = CONSOLE_METHOD[level];

  if (data !== undefined) {
    console[method](`${prefix} ${message}`, data);
  } else {
    console[method](`${prefix} ${message}`);
  }
}
