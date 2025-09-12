export class CoreError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class PluginNotFoundError extends CoreError {
  constructor(public pluginName: string, public searchPaths?: string[]) {
    const message = searchPaths && searchPaths.length > 0
      ? `Generator plugin not found: ${pluginName}. Searched in: ${searchPaths.join(', ')}`
      : `Generator plugin not found: ${pluginName}`;
    super(message);
  }
}

export class PluginLoadError extends CoreError {
  constructor(public pluginName: string, cause?: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to load generator plugin: ${pluginName}. Reason: ${causeMessage}`, cause);
  }
}

export class ValidationError extends CoreError {
  constructor(message: string, public field?: string, public value?: unknown) {
    const fullMessage = field 
      ? `Validation error for field '${field}': ${message}`
      : `Validation error: ${message}`;
    super(fullMessage);
  }
}

export class ConfigurationError extends CoreError {
  constructor(message: string, public configPath?: string) {
    const fullMessage = configPath
      ? `Configuration error in ${configPath}: ${message}`
      : `Configuration error: ${message}`;
    super(fullMessage);
  }
}

export class FileSystemError extends CoreError {
  constructor(
    message: string,
    public path: string,
    public operation: 'read' | 'write' | 'delete' | 'create',
    cause?: unknown
  ) {
    super(`File system error during ${operation} operation on ${path}: ${message}`, cause);
  }
}

export class ExecutionError extends CoreError {
  constructor(
    message: string,
    public command: string,
    public exitCode?: number,
    cause?: unknown
  ) {
    const fullMessage = exitCode !== undefined
      ? `${message} (exit code: ${exitCode})`
      : message;
    super(fullMessage, cause);
  }
}

export class InvalidPathError extends ValidationError {
  constructor(path: string, reason: string) {
    super(`Invalid path '${path}': ${reason}`, 'path', path);
  }
}
