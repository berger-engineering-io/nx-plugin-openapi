// Core interfaces and types
export * from './interfaces';

// Error classes
export * from './errors';

// Base generator implementation
export { BaseGenerator } from './base-generator';

// Registry for managing plugins
export { GeneratorRegistry, type ExtendedGeneratorRegistryConfig } from './registry';

// Plugin loader for dynamic loading
export { PluginLoader, type PluginLoaderOptions } from './plugin-loader';

// Auto-installer for plugins
export { 
  AutoInstaller, 
  autoInstaller,
  type PackageManager,
  type InstallOptions,
  type InstallResult 
} from './auto-installer';