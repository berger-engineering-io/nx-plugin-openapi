import { logger } from '@nx/devkit';
import {
  GeneratorPlugin,
  GeneratorOptions,
  GeneratorResult,
  GeneratorSchema,
  ValidationResult,
  ValidationError,
} from './interfaces';

/**
 * Abstract base class for generator plugins
 * Provides common functionality and utilities
 */
export abstract class BaseGenerator implements GeneratorPlugin {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly packageName?: string;
  abstract readonly minVersion?: string;

  /**
   * Default implementation checks if package can be resolved
   */
  async isAvailable(): Promise<boolean> {
    if (!this.packageName) {
      return true; // Bundled generators are always available
    }

    try {
      require.resolve(this.packageName, { paths: [process.cwd()] });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Subclasses must implement their schema
   */
  abstract getSchema(): GeneratorSchema;

  /**
   * Basic validation implementation
   * Can be overridden for custom validation
   */
  validateOptions(options: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const schema = this.getSchema();

    if (typeof options !== 'object' || options === null) {
      return {
        valid: false,
        errors: [{ path: '', message: 'Options must be an object' }],
      };
    }

    const optionsObj = options as Record<string, unknown>;

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in optionsObj) || optionsObj[field] === undefined) {
          errors.push({
            path: field,
            message: `Required field '${field}' is missing`,
          });
        }
      }
    }

    // Validate types
    for (const [key, value] of Object.entries(optionsObj)) {
      const property = schema.properties[key];
      if (!property) {
        continue; // Allow additional properties unless schema says otherwise
      }

      const actualType = this.getType(value);
      if (property.type !== actualType && value !== undefined && value !== null) {
        // Special handling for arrays and objects
        if (property.type === 'array' && !Array.isArray(value)) {
          errors.push({
            path: key,
            message: `Field '${key}' must be an array`,
          });
        } else if (property.type === 'object' && actualType !== 'object') {
          errors.push({
            path: key,
            message: `Field '${key}' must be an object`,
          });
        } else if (
          property.type !== 'array' &&
          property.type !== 'object' &&
          property.type !== actualType
        ) {
          errors.push({
            path: key,
            message: `Field '${key}' must be of type ${property.type}`,
          });
        }
      }

      // Validate enum values
      if (property.enum && !property.enum.includes(value)) {
        errors.push({
          path: key,
          message: `Field '${key}' must be one of: ${property.enum.join(', ')}`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Abstract method that subclasses must implement
   */
  abstract generate(options: GeneratorOptions): Promise<GeneratorResult>;

  /**
   * Abstract method to get supported generator types
   */
  abstract getSupportedTypes(): string[];

  /**
   * Optional method to get dependencies
   */
  getDependencies?(): string[];

  /**
   * Helper method to get JavaScript type
   */
  protected getType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Helper method to log messages
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const prefix = `[${this.displayName}]`;
    switch (level) {
      case 'info':
        logger.info(`${prefix} ${message}`);
        break;
      case 'warn':
        logger.warn(`${prefix} ${message}`);
        break;
      case 'error':
        logger.error(`${prefix} ${message}`);
        break;
    }
  }

  /**
   * Helper to check version compatibility
   */
  protected async checkVersion(
    packageName: string,
    minVersion: string
  ): Promise<boolean> {
    try {
      const packageJsonPath = require.resolve(`${packageName}/package.json`, {
        paths: [process.cwd()],
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const packageJson = require(packageJsonPath);
      const version = packageJson.version;

      // Simple version comparison (could be enhanced with semver)
      return this.compareVersions(version, minVersion) >= 0;
    } catch {
      return false;
    }
  }

  /**
   * Simple version comparison
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map((p) => parseInt(p, 10));
    const v2Parts = version2.split('.').map((p) => parseInt(p, 10));

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }

    return 0;
  }
}