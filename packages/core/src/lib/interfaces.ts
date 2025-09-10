/**
 * Core interfaces for the nx-plugin-openapi abstraction layer
 * Defines the contract for generator plugins and the plugin system
 */

export interface GeneratorOptions {
  readonly [key: string]: unknown;
}

export interface GeneratorContext {
  readonly workspaceRoot: string;
  readonly projectName?: string;
  readonly projectRoot?: string;
  readonly logger: Logger;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export interface GeneratorResult {
  readonly success: boolean;
  readonly message?: string;
  readonly generatedFiles?: string[];
  readonly errors?: string[];
}

export interface GeneratorPlugin {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly supportedFileTypes: readonly string[];
  readonly requiredOptions: readonly string[];
  
  generate(options: GeneratorOptions, context: GeneratorContext): Promise<GeneratorResult>;
  validate(options: GeneratorOptions): Promise<ValidationResult>;
  getSchema(): Promise<GeneratorSchema>;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
}

export interface ValidationError {
  readonly property: string;
  readonly message: string;
  readonly code: string;
}

export interface GeneratorSchema {
  readonly $schema?: string;
  readonly type: 'object';
  readonly properties: { [key: string]: SchemaProperty };
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
}

export interface SchemaProperty {
  readonly type: string;
  readonly description?: string;
  readonly default?: unknown;
  readonly enum?: readonly unknown[];
  readonly items?: SchemaProperty;
  readonly properties?: { [key: string]: SchemaProperty };
}

export interface PluginMetadata {
  readonly name: string;
  readonly version: string;
  readonly packageName: string;
  readonly description?: string;
  readonly homepage?: string;
  readonly repository?: string;
  readonly keywords?: readonly string[];
  readonly supportedFileTypes: readonly string[];
  readonly requiredOptions: readonly string[];
  readonly isInstalled: boolean;
  readonly installationPath?: string;
}

export interface PluginRegistryOptions {
  readonly autoInstall?: boolean;
  readonly registryUrl?: string;
  readonly cacheDirectory?: string;
  readonly timeout?: number;
}

export interface AutoInstallOptions {
  readonly packageManager?: 'npm' | 'yarn' | 'pnpm';
  readonly global?: boolean;
  readonly registry?: string;
  readonly timeout?: number;
  readonly force?: boolean;
}

export interface PluginLoadOptions extends GeneratorOptions {
  readonly autoInstall?: boolean;
  readonly version?: string;
  readonly registry?: string;
}

export interface BaseGeneratorOptions extends GeneratorOptions {
  readonly outputPath: string;
  readonly inputSpec: string;
  readonly dryRun?: boolean;
  readonly force?: boolean;
}

export type PluginFactory = (options?: GeneratorOptions) => GeneratorPlugin | Promise<GeneratorPlugin>;

export interface PluginModule {
  readonly default: PluginFactory;
  readonly metadata?: Partial<PluginMetadata>;
}