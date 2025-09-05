import { ExecutorContext } from '@nx/devkit';

/**
 * Core interface that all generator plugins must implement
 */
export interface GeneratorPlugin {
  /**
   * Unique identifier for the generator
   */
  readonly name: string;

  /**
   * Display name for UI/logs
   */
  readonly displayName: string;

  /**
   * Description of what this generator produces
   */
  readonly description: string;

  /**
   * Package name if external dependency needed
   */
  readonly packageName?: string;

  /**
   * Minimum version requirement
   */
  readonly minVersion?: string;

  /**
   * Check if generator is available/installed
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the configuration schema for this generator
   */
  getSchema(): GeneratorSchema;

  /**
   * Validate options against schema
   */
  validateOptions(options: unknown): ValidationResult;

  /**
   * Generate code from OpenAPI spec
   */
  generate(options: GeneratorOptions): Promise<GeneratorResult>;

  /**
   * Get supported generator types (e.g., 'typescript-angular', 'typescript-fetch')
   */
  getSupportedTypes(): string[];

  /**
   * Get required dependencies for this generator
   */
  getDependencies?(): string[];
}

/**
 * Options passed to the generator
 */
export interface GeneratorOptions {
  /**
   * Path to the OpenAPI specification file
   */
  inputSpec: string;

  /**
   * Output directory for the generated API code
   */
  outputPath: string;

  /**
   * Generator type (e.g., 'typescript-angular')
   */
  generatorType?: string;

  /**
   * Generator-specific configuration
   */
  config?: Record<string, unknown>;

  /**
   * Global properties for code generation
   */
  globalProperties?: Record<string, string>;

  /**
   * Nx executor context
   */
  context: ExecutorContext;

  /**
   * All raw options from executor
   */
  rawOptions: Record<string, unknown>;
}

/**
 * Result returned by generator
 */
export interface GeneratorResult {
  /**
   * Whether the generation was successful
   */
  success: boolean;

  /**
   * Error if generation failed
   */
  error?: Error;

  /**
   * List of generated files (optional)
   */
  outputFiles?: string[];

  /**
   * Any warnings during generation
   */
  warnings?: string[];
}

/**
 * Schema for generator configuration
 */
export interface GeneratorSchema {
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required?: string[];
}

/**
 * Individual schema property
 */
export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  default?: unknown;
  enum?: unknown[];
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  additionalProperties?: SchemaProperty | boolean;
}

/**
 * Result of validation
 */
export interface ValidationResult {
  /**
   * Whether validation passed
   */
  valid: boolean;

  /**
   * Validation errors
   */
  errors?: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /**
   * Path to the invalid property
   */
  path: string;

  /**
   * Error message
   */
  message: string;
}

/**
 * Plugin metadata for discovery
 */
export interface PluginMetadata {
  /**
   * Plugin name
   */
  name: string;

  /**
   * Package name to install
   */
  packageName: string;

  /**
   * Whether to auto-install if missing
   */
  autoInstall?: boolean;

  /**
   * Plugin configuration
   */
  config?: Record<string, unknown>;
}

/**
 * Registry configuration
 */
export interface RegistryConfig {
  /**
   * Default generator to use
   */
  defaultGenerator?: string;

  /**
   * Registered plugins
   */
  plugins?: Record<string, PluginMetadata>;
}

/**
 * Options for auto-installation
 */
export interface AutoInstallOptions {
  /**
   * Whether to prompt for installation
   */
  prompt?: boolean;

  /**
   * Package manager to use (npm, yarn, pnpm)
   */
  packageManager?: 'npm' | 'yarn' | 'pnpm';

  /**
   * Whether running in CI environment
   */
  ci?: boolean;
}