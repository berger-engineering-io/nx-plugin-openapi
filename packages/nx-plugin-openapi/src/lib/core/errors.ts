/**
 * Base error for all generator-related errors
 */
export class GeneratorError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'GeneratorError';
    Object.setPrototypeOf(this, GeneratorError.prototype);
  }
}

/**
 * Error thrown when a generator plugin is not found
 */
export class GeneratorNotFoundError extends GeneratorError {
  constructor(public readonly generatorName: string) {
    super(`Generator plugin '${generatorName}' not found`);
    this.name = 'GeneratorNotFoundError';
    Object.setPrototypeOf(this, GeneratorNotFoundError.prototype);
  }
}

/**
 * Error thrown when a generator plugin is not installed
 */
export class GeneratorNotInstalledError extends GeneratorError {
  constructor(
    public readonly generatorName: string,
    public readonly packageName: string
  ) {
    super(
      `Generator plugin '${generatorName}' requires package '${packageName}' to be installed`
    );
    this.name = 'GeneratorNotInstalledError';
    Object.setPrototypeOf(this, GeneratorNotInstalledError.prototype);
  }
}

/**
 * Error thrown when generator validation fails
 */
export class GeneratorValidationError extends GeneratorError {
  constructor(
    message: string,
    public readonly validationErrors: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'GeneratorValidationError';
    Object.setPrototypeOf(this, GeneratorValidationError.prototype);
  }
}

/**
 * Error thrown when plugin loading fails
 */
export class PluginLoadError extends GeneratorError {
  constructor(
    public readonly pluginName: string,
    public readonly packageName: string,
    cause?: Error
  ) {
    super(`Failed to load plugin '${pluginName}' from package '${packageName}'`, cause);
    this.name = 'PluginLoadError';
    Object.setPrototypeOf(this, PluginLoadError.prototype);
  }
}

/**
 * Error thrown when plugin installation fails
 */
export class PluginInstallError extends GeneratorError {
  constructor(
    public readonly packageName: string,
    public readonly packageManager: string,
    cause?: Error
  ) {
    super(
      `Failed to install plugin package '${packageName}' using ${packageManager}`,
      cause
    );
    this.name = 'PluginInstallError';
    Object.setPrototypeOf(this, PluginInstallError.prototype);
  }
}

/**
 * Error thrown when generator execution fails
 */
export class GeneratorExecutionError extends GeneratorError {
  constructor(
    public readonly generatorName: string,
    message: string,
    cause?: Error
  ) {
    super(`Generator '${generatorName}' execution failed: ${message}`, cause);
    this.name = 'GeneratorExecutionError';
    Object.setPrototypeOf(this, GeneratorExecutionError.prototype);
  }
}