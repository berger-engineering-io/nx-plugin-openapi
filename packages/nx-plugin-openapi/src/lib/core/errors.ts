/**
 * Base class for all generator-related errors
 */
export abstract class GeneratorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert the error to a JSON-serializable object
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Error thrown when a requested generator plugin is not found
 */
export class GeneratorNotFoundError extends GeneratorError {
  constructor(generatorName: string, availableGenerators: string[] = []) {
    super(
      `Generator '${generatorName}' not found. Available generators: ${availableGenerators.join(', ')}`,
      'GENERATOR_NOT_FOUND',
      {
        generatorName,
        availableGenerators,
      }
    );
  }
}

/**
 * Error thrown when generator options validation fails
 */
export class GeneratorValidationError extends GeneratorError {
  constructor(generatorName: string, validationErrors: string[]) {
    super(
      `Validation failed for generator '${generatorName}': ${validationErrors.join(', ')}`,
      'GENERATOR_VALIDATION_FAILED',
      {
        generatorName,
        validationErrors,
      }
    );
  }
}

/**
 * Error thrown when generator execution fails
 */
export class GeneratorExecutionError extends GeneratorError {
  constructor(
    generatorName: string,
    originalError: Error,
    exitCode?: number,
    stdout?: string,
    stderr?: string
  ) {
    super(
      `Generator '${generatorName}' execution failed: ${originalError.message}`,
      'GENERATOR_EXECUTION_FAILED',
      {
        generatorName,
        originalError: {
          name: originalError.name,
          message: originalError.message,
          stack: originalError.stack,
        },
        exitCode,
        stdout,
        stderr,
      }
    );
  }
}

/**
 * Error thrown when plugin loading fails
 */
export class PluginLoadError extends GeneratorError {
  constructor(
    packageName: string,
    originalError: Error,
    pluginPath?: string
  ) {
    super(
      `Failed to load plugin '${packageName}': ${originalError.message}`,
      'PLUGIN_LOAD_FAILED',
      {
        packageName,
        pluginPath,
        originalError: {
          name: originalError.name,
          message: originalError.message,
          stack: originalError.stack,
        },
      }
    );
  }
}

/**
 * Error thrown when a plugin doesn't implement the required interface correctly
 */
export class PluginInterfaceError extends GeneratorError {
  constructor(
    packageName: string,
    missingMethods: string[],
    invalidMethods: string[] = []
  ) {
    const issues: string[] = [];
    if (missingMethods.length > 0) {
      issues.push(`missing methods: ${missingMethods.join(', ')}`);
    }
    if (invalidMethods.length > 0) {
      issues.push(`invalid methods: ${invalidMethods.join(', ')}`);
    }

    super(
      `Plugin '${packageName}' doesn't implement the GeneratorPlugin interface correctly: ${issues.join('; ')}`,
      'PLUGIN_INTERFACE_INVALID',
      {
        packageName,
        missingMethods,
        invalidMethods,
      }
    );
  }
}

/**
 * Error thrown when plugin registration fails
 */
export class PluginRegistrationError extends GeneratorError {
  constructor(generatorName: string, reason: string, existingPlugin?: string) {
    super(
      `Failed to register plugin '${generatorName}': ${reason}`,
      'PLUGIN_REGISTRATION_FAILED',
      {
        generatorName,
        reason,
        existingPlugin,
      }
    );
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends GeneratorError {
  constructor(configPath: string, validationErrors: string[]) {
    super(
      `Invalid configuration in '${configPath}': ${validationErrors.join(', ')}`,
      'CONFIGURATION_INVALID',
      {
        configPath,
        validationErrors,
      }
    );
  }
}

/**
 * Error thrown when file system operations fail
 */
export class FileSystemError extends GeneratorError {
  constructor(operation: string, path: string, originalError: Error) {
    super(
      `File system operation '${operation}' failed for path '${path}': ${originalError.message}`,
      'FILESYSTEM_ERROR',
      {
        operation,
        path,
        originalError: {
          name: originalError.name,
          message: originalError.message,
          stack: originalError.stack,
        },
      }
    );
  }
}

/**
 * Type guard to check if an error is a generator-related error
 */
export function isGeneratorError(error: unknown): error is GeneratorError {
  return error instanceof GeneratorError;
}

/**
 * Helper function to wrap unknown errors into GeneratorError
 */
export function wrapError(error: unknown, context: string): GeneratorError {
  if (error instanceof GeneratorError) {
    return error;
  }

  if (error instanceof Error) {
    return new GeneratorExecutionError('unknown', error);
  }

  return new GeneratorExecutionError(
    'unknown',
    new Error(`Unknown error in ${context}: ${String(error)}`)
  );
}