/**
 * @nx-plugin-openapi/core - Core abstraction layer for generator plugins
 * 
 * This package provides the foundational interfaces, classes, and utilities
 * for building and managing generator plugins in the nx-plugin-openapi ecosystem.
 */

// Core interfaces and types
export * from './lib/interfaces';

// Error classes
export * from './lib/errors';

// Base generator class
export { BaseGenerator } from './lib/base-generator';

// Plugin loading system
export { PluginLoader } from './lib/plugin-loader';

// Auto-installation system
export { AutoInstaller } from './lib/auto-installer';

// Plugin registry
export { PluginRegistry } from './lib/registry';

// Re-export commonly used types for convenience
export type {
  GeneratorPlugin,
  GeneratorOptions,
  GeneratorContext,
  GeneratorResult,
  PluginMetadata,
  ValidationResult,
  ValidationError,
  GeneratorSchema,
  Logger,
  PluginFactory,
  PluginModule
} from './lib/interfaces';