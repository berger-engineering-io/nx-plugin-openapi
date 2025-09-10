/**
 * Base abstract generator class that provides common functionality
 * for all generator plugins in the nx-plugin-openapi system
 */

import {
  GeneratorPlugin,
  GeneratorOptions,
  GeneratorContext,
  GeneratorResult,
  ValidationResult,
  ValidationError,
  GeneratorSchema,
  BaseGeneratorOptions,
  SchemaProperty
} from './interfaces';
import { PluginValidationError, GeneratorExecutionError, InvalidOptionsError } from './errors';

export abstract class BaseGenerator implements GeneratorPlugin {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly supportedFileTypes: readonly string[];
  abstract readonly requiredOptions: readonly string[];

  public readonly description?: string;

  constructor(options?: { description?: string }) {
    this.description = options?.description;
  }

  /**
   * Main generation method that must be implemented by concrete generators
   */
  abstract generate(options: GeneratorOptions, context: GeneratorContext): Promise<GeneratorResult>;

  /**
   * Get the JSON schema for this generator's options
   */
  abstract getSchema(): Promise<GeneratorSchema>;

  /**
   * Validate options against the generator's schema and requirements
   */
  async validate(options: GeneratorOptions): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    try {
      // Validate required options
      const missingRequired = this.requiredOptions.filter(
        option => options[option] === undefined || options[option] === null || options[option] === ''
      );

      if (missingRequired.length > 0) {
        errors.push(...missingRequired.map(option => ({
          property: option,
          message: `Required option '${option}' is missing`,
          code: 'REQUIRED_OPTION_MISSING'
        })));
      }

      // Validate against schema
      const schema = await this.getSchema();
      const schemaErrors = await this.validateAgainstSchema(options, schema);
      errors.push(...schemaErrors);

      // Custom validation
      const customErrors = await this.customValidation(options);
      errors.push(...customErrors);

    } catch (error) {
      errors.push({
        property: 'validation',
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        code: 'VALIDATION_ERROR'
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Custom validation logic that can be overridden by concrete generators
   */
  protected async customValidation(options: GeneratorOptions): Promise<ValidationError[]> {
    return [];
  }

  /**
   * Validate options against JSON schema
   */
  protected async validateAgainstSchema(options: GeneratorOptions, schema: GeneratorSchema): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Basic schema validation
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in options) || options[requiredProp] === undefined || options[requiredProp] === null) {
          errors.push({
            property: requiredProp,
            message: `Required property '${requiredProp}' is missing`,
            code: 'REQUIRED_PROPERTY_MISSING'
          });
        }
      }
    }

    // Type validation for properties
    for (const [propName, propValue] of Object.entries(options)) {
      const schemaProp = schema.properties[propName];
      if (schemaProp && propValue !== undefined && propValue !== null) {
        const typeErrors = this.validatePropertyType(propName, propValue, schemaProp);
        errors.push(...typeErrors);
      }
    }

    return errors;
  }

  /**
   * Validate a single property against its schema definition
   */
  protected validatePropertyType(propName: string, value: unknown, schema: SchemaProperty): ValidationError[] {
    const errors: ValidationError[] = [];

    // Basic type checking
    if (schema.type === 'string' && typeof value !== 'string') {
      errors.push({
        property: propName,
        message: `Property '${propName}' must be a string`,
        code: 'INVALID_TYPE'
      });
    } else if (schema.type === 'number' && typeof value !== 'number') {
      errors.push({
        property: propName,
        message: `Property '${propName}' must be a number`,
        code: 'INVALID_TYPE'
      });
    } else if (schema.type === 'boolean' && typeof value !== 'boolean') {
      errors.push({
        property: propName,
        message: `Property '${propName}' must be a boolean`,
        code: 'INVALID_TYPE'
      });
    } else if (schema.type === 'array' && !Array.isArray(value)) {
      errors.push({
        property: propName,
        message: `Property '${propName}' must be an array`,
        code: 'INVALID_TYPE'
      });
    } else if (schema.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
      errors.push({
        property: propName,
        message: `Property '${propName}' must be an object`,
        code: 'INVALID_TYPE'
      });
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        property: propName,
        message: `Property '${propName}' must be one of: ${schema.enum.join(', ')}`,
        code: 'INVALID_ENUM_VALUE'
      });
    }

    return errors;
  }

  /**
   * Execute the generator with validation and error handling
   */
  async executeWithValidation(options: GeneratorOptions, context: GeneratorContext): Promise<GeneratorResult> {
    try {
      // Validate options first
      const validation = await this.validate(options);
      if (!validation.isValid) {
        throw new PluginValidationError(
          this.name,
          validation.errors.map(e => `${e.property}: ${e.message}`)
        );
      }

      // Execute generation
      const result = await this.generate(options, context);
      
      // Log result
      if (result.success) {
        context.logger.info(`Generator '${this.name}' completed successfully`);
        if (result.generatedFiles?.length) {
          context.logger.info(`Generated ${result.generatedFiles.length} files`);
        }
      } else {
        context.logger.error(`Generator '${this.name}' failed: ${result.message || 'Unknown error'}`);
        if (result.errors?.length) {
          result.errors.forEach(error => context.logger.error(error));
        }
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      context.logger.error(`Generator '${this.name}' execution failed: ${errorMessage}`);
      
      if (error instanceof PluginValidationError || error instanceof InvalidOptionsError) {
        throw error;
      }
      
      throw new GeneratorExecutionError(this.name, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Helper to create a successful result
   */
  protected createSuccessResult(options: {
    message?: string;
    generatedFiles?: string[];
  } = {}): GeneratorResult {
    return {
      success: true,
      message: options.message,
      generatedFiles: options.generatedFiles,
      errors: []
    };
  }

  /**
   * Helper to create a failed result
   */
  protected createFailedResult(options: {
    message?: string;
    errors?: string[];
  } = {}): GeneratorResult {
    return {
      success: false,
      message: options.message,
      generatedFiles: [],
      errors: options.errors || []
    };
  }

  /**
   * Helper to validate base generator options
   */
  protected validateBaseOptions(options: GeneratorOptions): asserts options is BaseGeneratorOptions {
    if (!options['outputPath']) {
      throw new InvalidOptionsError('outputPath is required', ['outputPath']);
    }
    if (!options['inputSpec']) {
      throw new InvalidOptionsError('inputSpec is required', ['inputSpec']);
    }
  }
}