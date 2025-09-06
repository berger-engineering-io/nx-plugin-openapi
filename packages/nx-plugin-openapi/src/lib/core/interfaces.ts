import { ExecutorContext, Tree } from '@nx/devkit';

/**
 * Represents a generator plugin that can generate API clients from OpenAPI specifications
 */
export interface GeneratorPlugin {
  /**
   * The unique identifier for this generator
   */
  readonly name: string;

  /**
   * Human-readable display name for this generator
   */
  readonly displayName: string;

  /**
   * The npm package name this generator belongs to
   */
  readonly packageName: string;

  /**
   * Generate API client code from OpenAPI specification
   * @param options - Generation options
   * @param context - Execution context
   * @returns Promise resolving to generation result
   */
  generate(options: GeneratorOptions, context: GeneratorContext): Promise<GeneratorResult>;

  /**
   * Get the list of supported generator types/languages
   * @returns Array of supported generator types
   */
  getSupportedTypes(): string[];

  /**
   * Get the JSON schema for this generator's specific options
   * @returns JSON schema object
   */
  getSchema(): GeneratorSchema;

  /**
   * Validate the provided options against this generator's requirements
   * @param options - Options to validate
   * @returns Validation result with any errors
   */
  validate(options: GeneratorOptions): { valid: boolean; errors: string[] };
}

/**
 * Configuration options for API generation
 */
export interface GeneratorOptions {
  /**
   * Path to OpenAPI specification file or object mapping service names to spec paths
   */
  inputSpec: string | Record<string, string>;

  /**
   * Output directory path for generated code
   */
  outputPath: string;

  /**
   * The generator to use (e.g., 'openapi-tools', 'custom-generator')
   */
  generator?: string;

  /**
   * Path to generator configuration file
   */
  configFile?: string;

  /**
   * Skip validation of the OpenAPI specification
   */
  skipValidateSpec?: boolean;

  /**
   * Authentication configuration
   */
  auth?: string;

  /**
   * Suffix to append to generated API class names
   */
  apiNameSuffix?: string;

  /**
   * Package name for generated API classes
   */
  apiPackage?: string;

  /**
   * Artifact ID for the generated code
   */
  artifactId?: string;

  /**
   * Version of the generated artifact
   */
  artifactVersion?: string;

  /**
   * Run in dry-run mode without generating files
   */
  dryRun?: boolean;

  /**
   * Enable post-processing of generated files
   */
  enablePostProcessFile?: boolean;

  /**
   * Git host for repository information
   */
  gitHost?: string;

  /**
   * Git repository ID
   */
  gitRepoId?: string;

  /**
   * Git user ID
   */
  gitUserId?: string;

  /**
   * Global properties to pass to the generator
   */
  globalProperties?: Record<string, string>;

  /**
   * Group ID for the generated code
   */
  groupId?: string;

  /**
   * Custom HTTP user agent string
   */
  httpUserAgent?: string;

  /**
   * Path to ignore file override
   */
  ignoreFileOverride?: string;

  /**
   * Root directory for input specifications
   */
  inputSpecRootDirectory?: string;

  /**
   * Package name for generated invoker/client classes
   */
  invokerPackage?: string;

  /**
   * Log output to stderr instead of stdout
   */
  logToStderr?: boolean;

  /**
   * Perform minimal updates to existing files
   */
  minimalUpdate?: boolean;

  /**
   * Prefix for generated model class names
   */
  modelNamePrefix?: string;

  /**
   * Suffix for generated model class names
   */
  modelNameSuffix?: string;

  /**
   * Package name for generated model classes
   */
  modelPackage?: string;

  /**
   * Main package name for the generated code
   */
  packageName?: string;

  /**
   * Release notes for the generated code
   */
  releaseNote?: string;

  /**
   * Remove operation ID prefix from method names
   */
  removeOperationIdPrefix?: boolean;

  /**
   * Skip overwriting existing files
   */
  skipOverwrite?: boolean;

  /**
   * Skip generation of operation examples
   */
  skipOperationExample?: boolean;

  /**
   * Enable strict specification validation
   */
  strictSpec?: boolean;

  /**
   * Directory containing custom templates
   */
  templateDirectory?: string;

  /**
   * Additional generator-specific options
   */
  [key: string]: any;
}

/**
 * Result of a generation operation
 */
export interface GeneratorResult {
  /**
   * Whether the generation was successful
   */
  success: boolean;

  /**
   * List of error messages if generation failed
   */
  errors: string[];

  /**
   * List of warning messages
   */
  warnings: string[];

  /**
   * List of generated files (relative paths)
   */
  generatedFiles?: string[];

  /**
   * Additional metadata about the generation process
   */
  metadata?: Record<string, any>;
}

/**
 * JSON schema definition for generator-specific options
 */
export interface GeneratorSchema {
  /**
   * Schema type (should be 'object')
   */
  type: 'object';

  /**
   * Schema properties definition
   */
  properties: Record<string, any>;

  /**
   * Required properties
   */
  required?: string[];

  /**
   * Additional properties allowed
   */
  additionalProperties?: boolean;

  /**
   * Schema title
   */
  title?: string;

  /**
   * Schema description
   */
  description?: string;
}

/**
 * Extended execution context for generators
 */
export interface GeneratorContext extends ExecutorContext {
  /**
   * File system tree for reading/writing files (optional, for Nx generators)
   */
  tree?: Tree;

  /**
   * Additional generator-specific context
   */
  generatorContext?: Record<string, any>;
}

/**
 * Configuration for the generator registry
 */
export interface GeneratorRegistryConfig {
  /**
   * Default generator to use when none is specified
   */
  defaultGenerator?: string;

  /**
   * Search paths for discovering generator plugins
   */
  searchPaths?: string[];

  /**
   * Mapping of generator names to their package locations
   */
  generators?: Record<string, string>;
}

/**
 * Plugin discovery result
 */
export interface PluginDiscoveryResult {
  /**
   * The discovered plugin instance
   */
  plugin: GeneratorPlugin;

  /**
   * Source of the plugin (e.g., 'bundled', 'npm', 'local')
   */
  source: 'bundled' | 'npm' | 'local';

  /**
   * Version of the plugin package
   */
  version?: string;

  /**
   * Path where the plugin was found
   */
  path?: string;
}