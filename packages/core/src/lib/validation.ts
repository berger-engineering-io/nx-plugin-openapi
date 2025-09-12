// Core validation utilities
import { ValidationError, InvalidPathError } from './errors';
import { isValidInputSpec, assertValidPath } from './type-guards';
import { logger } from './logger';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export class OptionsValidator {
  private errors: ValidationError[] = [];

  validate(options: unknown): ValidationResult {
    this.errors = [];
    
    if (!options || typeof options !== 'object') {
      this.addError('Options must be an object', 'options', options);
      return this.getResult();
    }

    const opts = options as Record<string, unknown>;
    
    // Validate inputSpec
    this.validateInputSpec(opts['inputSpec']);
    
    // Validate outputPath
    this.validateOutputPath(opts['outputPath']);
    
    // Validate generatorOptions if present
    if ('generatorOptions' in opts && opts['generatorOptions'] !== undefined) {
      this.validateGeneratorOptions(opts['generatorOptions']);
    }

    return this.getResult();
  }

  private validateInputSpec(value: unknown): void {
    if (!isValidInputSpec(value)) {
      if (value === undefined || value === null) {
        this.addError('inputSpec is required', 'inputSpec', value);
      } else if (typeof value === 'string' && value.length === 0) {
        this.addError('inputSpec cannot be empty', 'inputSpec', value);
      } else if (typeof value === 'object' && Object.keys(value).length === 0) {
        this.addError('inputSpec object cannot be empty', 'inputSpec', value);
      } else {
        this.addError(
          'inputSpec must be a non-empty string or an object with string values',
          'inputSpec',
          value
        );
      }
    }
  }

  private validateOutputPath(value: unknown): void {
    if (value === undefined || value === null) {
      this.addError('outputPath is required', 'outputPath', value);
      return;
    }

    if (typeof value !== 'string') {
      this.addError('outputPath must be a string', 'outputPath', value);
      return;
    }

    if (value.length === 0) {
      this.addError('outputPath cannot be empty', 'outputPath', value);
      return;
    }

    try {
      assertValidPath(value, 'outputPath');
    } catch (error) {
      if (error instanceof Error) {
        this.errors.push(new InvalidPathError(value, error.message));
      }
    }
  }

  private validateGeneratorOptions(value: unknown): void {
    if (value === null) {
      this.addError('generatorOptions cannot be null', 'generatorOptions', value);
      return;
    }

    if (Array.isArray(value)) {
      this.addError('generatorOptions cannot be an array', 'generatorOptions', value);
      return;
    }

    if (typeof value !== 'object') {
      this.addError('generatorOptions must be an object', 'generatorOptions', value);
    }
  }

  private addError(message: string, field?: string, value?: unknown): void {
    const error = new ValidationError(message, field, value);
    this.errors.push(error);
    logger.debug(`Validation error: ${error.message}`);
  }

  private getResult(): ValidationResult {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
    };
  }
}

export function validateGenerateOptions(options: unknown): void {
  const validator = new OptionsValidator();
  const result = validator.validate(options);
  
  if (!result.valid) {
    const errorMessages = result.errors.map(e => e.message).join('; ');
    logger.error(`Validation failed: ${errorMessages}`);
    throw result.errors[0]; // Throw the first error
  }
}

export function validatePluginName(name: unknown): void {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('Plugin name must be a non-empty string', 'pluginName', name);
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new ValidationError('Plugin name cannot be empty', 'pluginName', name);
  }

  // Check for invalid characters
  const invalidChars = /[<>:"|?*]/;
  if (invalidChars.test(trimmed)) {
    throw new ValidationError(
      'Plugin name contains invalid characters',
      'pluginName',
      name
    );
  }
}