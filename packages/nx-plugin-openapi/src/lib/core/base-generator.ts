import { logger } from '@nx/devkit';
import { spawn } from 'child_process';
import { 
  GeneratorPlugin, 
  GeneratorOptions, 
  GeneratorResult, 
  GeneratorSchema, 
  GeneratorContext 
} from './interfaces';
import { 
  GeneratorValidationError, 
  GeneratorExecutionError, 
  wrapError 
} from './errors';

/**
 * Abstract base class for generator plugins that provides common functionality
 */
export abstract class BaseGenerator implements GeneratorPlugin {
  public abstract readonly name: string;
  public abstract readonly displayName: string;
  public abstract readonly packageName: string;

  /**
   * Generate API client code from OpenAPI specification
   * Subclasses should implement the specific generation logic
   */
  public abstract generate(options: GeneratorOptions, context: GeneratorContext): Promise<GeneratorResult>;

  /**
   * Get the list of supported generator types/languages
   * Subclasses should override this to return their supported types
   */
  public abstract getSupportedTypes(): string[];

  /**
   * Get the JSON schema for this generator's specific options
   * Subclasses should override this to return their schema
   */
  public abstract getSchema(): GeneratorSchema;

  /**
   * Validate the provided options against this generator's requirements
   * Base implementation provides common validation logic
   */
  public validate(options: GeneratorOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!options.inputSpec) {
      errors.push('inputSpec is required');
    }

    if (!options.outputPath) {
      errors.push('outputPath is required');
    }

    // Validate inputSpec format
    if (options.inputSpec) {
      if (typeof options.inputSpec === 'object') {
        // Multiple specs validation
        const entries = Object.entries(options.inputSpec);
        if (entries.length === 0) {
          errors.push('inputSpec object cannot be empty');
        }
        for (const [serviceName, specPath] of entries) {
          if (!serviceName || typeof serviceName !== 'string') {
            errors.push('All service names in inputSpec must be non-empty strings');
          }
          if (!specPath || typeof specPath !== 'string') {
            errors.push(`Spec path for service '${serviceName}' must be a non-empty string`);
          }
        }
      } else if (typeof options.inputSpec !== 'string') {
        errors.push('inputSpec must be a string or object');
      }
    }

    // Validate outputPath
    if (options.outputPath && typeof options.outputPath !== 'string') {
      errors.push('outputPath must be a string');
    }

    // Additional custom validation from subclasses
    const customValidation = this.validateCustomOptions(options);
    if (customValidation.errors.length > 0) {
      errors.push(...customValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Custom validation logic for subclass-specific options
   * Override this method to add generator-specific validation
   */
  protected validateCustomOptions(options: GeneratorOptions): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }

  /**
   * Execute a command with proper error handling and logging
   */
  protected async executeCommand(
    command: string,
    args: string[],
    options: {
      cwd: string;
      stdio?: 'pipe' | 'inherit';
      timeout?: number;
    }
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      this.logVerbose(`Executing command: ${command} ${args.join(' ')}`);
      
      const childProcess = spawn(command, args, {
        cwd: options.cwd,
        stdio: options.stdio || 'pipe',
      });

      let stdout = '';
      let stderr = '';

      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data) => {
          const output = data.toString();
          stdout += output;
          if (options.stdio !== 'inherit') {
            this.logVerbose(`STDOUT: ${output}`);
          }
        });
      }

      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data) => {
          const output = data.toString();
          stderr += output;
          if (options.stdio !== 'inherit') {
            this.logVerbose(`STDERR: ${output}`);
          }
        });
      }

      // Set up timeout if specified
      let timeoutId: NodeJS.Timeout | undefined;
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          childProcess.kill('SIGTERM');
          reject(new Error(`Command timed out after ${options.timeout}ms`));
        }, options.timeout);
      }

      childProcess.on('close', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
        });
      });

      childProcess.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(error);
      });
    });
  }

  /**
   * Validate options and throw error if validation fails
   */
  protected validateOptionsOrThrow(options: GeneratorOptions): void {
    const validation = this.validate(options);
    if (!validation.valid) {
      throw new GeneratorValidationError(this.name, validation.errors);
    }
  }

  /**
   * Create a successful generation result
   */
  protected createSuccessResult(
    generatedFiles?: string[],
    warnings: string[] = [],
    metadata?: Record<string, any>
  ): GeneratorResult {
    return {
      success: true,
      errors: [],
      warnings,
      generatedFiles,
      metadata,
    };
  }

  /**
   * Create a failed generation result
   */
  protected createFailureResult(
    errors: string[],
    warnings: string[] = [],
    metadata?: Record<string, any>
  ): GeneratorResult {
    return {
      success: false,
      errors,
      warnings,
      metadata,
    };
  }

  /**
   * Handle errors during generation with proper logging and error transformation
   */
  protected handleGenerationError(error: unknown, operationName: string): GeneratorResult {
    const wrappedError = wrapError(error, operationName);
    
    this.logError(`${operationName} failed: ${wrappedError.message}`);
    
    if (wrappedError instanceof GeneratorExecutionError) {
      const details = wrappedError.details;
      if (details?.stderr) {
        this.logError(`STDERR: ${details.stderr}`);
      }
      if (details?.stdout) {
        this.logVerbose(`STDOUT: ${details.stdout}`);
      }
    }

    return this.createFailureResult([wrappedError.message]);
  }

  /**
   * Utility method for logging info messages with generator prefix
   */
  protected logInfo(message: string): void {
    logger.info(`[${this.name}] ${message}`);
  }

  /**
   * Utility method for logging error messages with generator prefix
   */
  protected logError(message: string): void {
    logger.error(`[${this.name}] ${message}`);
  }

  /**
   * Utility method for logging verbose messages with generator prefix
   */
  protected logVerbose(message: string): void {
    logger.verbose(`[${this.name}] ${message}`);
  }

  /**
   * Utility method for logging warning messages with generator prefix
   */
  protected logWarning(message: string): void {
    logger.warn(`[${this.name}] ${message}`);
  }

  /**
   * Check if the generator supports a specific type
   */
  public supportsType(type: string): boolean {
    return this.getSupportedTypes().includes(type);
  }

  /**
   * Get a formatted description of this generator
   */
  public getDescription(): string {
    const supportedTypes = this.getSupportedTypes();
    return `${this.displayName} - Supports: ${supportedTypes.join(', ')}`;
  }

  /**
   * Merge generator options with defaults
   */
  protected mergeWithDefaults(options: GeneratorOptions, defaults: Partial<GeneratorOptions>): GeneratorOptions {
    return {
      ...defaults,
      ...options,
    };
  }

  /**
   * Sanitize options to remove undefined values and prepare for serialization
   */
  protected sanitizeOptions(options: GeneratorOptions): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== null) {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}