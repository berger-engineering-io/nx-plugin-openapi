export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
}

export class Logger {
  private static instance: Logger | null = null;
  private level: LogLevel;
  private prefix: string;
  private timestamp: boolean;

  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? (process.env['NX_PLUGIN_LOG_LEVEL'] as LogLevel) ?? 'info';
    this.prefix = options.prefix ?? '[nx-plugin-openapi]';
    this.timestamp = options.timestamp ?? true;
  }

  static getInstance(options?: LoggerOptions): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    }
    return Logger.instance;
  }

  static reset(): void {
    Logger.instance = null;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const parts: string[] = [];
    
    if (this.timestamp) {
      parts.push(new Date().toISOString());
    }
    
    if (this.prefix) {
      parts.push(this.prefix);
    }
    
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);
    
    if (args.length > 0) {
      const formattedArgs = args.map(arg => {
        if (arg instanceof Error) {
          return `${arg.name}: ${arg.message}${arg.stack ? '\n' + arg.stack : ''}`;
        }
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      });
      parts.push(...formattedArgs);
    }
    
    return parts.join(' ');
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, ...args));
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, ...args));
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  group(label: string): void {
    if (this.shouldLog('debug')) {
      console.group(this.formatMessage('debug', label));
    }
  }

  groupEnd(): void {
    if (this.shouldLog('debug')) {
      console.groupEnd();
    }
  }

  time(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(`${this.prefix} ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(`${this.prefix} ${label}`);
    }
  }
}

export const logger = Logger.getInstance();