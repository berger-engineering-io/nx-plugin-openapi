// Export core interfaces and classes for plugin development
export {
  GeneratorPlugin,
  GeneratorOptions,
  GeneratorResult,
  GeneratorSchema,
  SchemaProperty,
  ValidationResult,
  ValidationError,
  PluginMetadata,
  RegistryConfig,
  AutoInstallOptions,
} from './lib/core/interfaces';

export { BaseGenerator } from './lib/core/base-generator';
export { GeneratorRegistry } from './lib/core/registry';
export { PluginLoader } from './lib/core/plugin-loader';
export { PluginAutoInstaller } from './lib/core/auto-installer';

export {
  GeneratorError,
  GeneratorNotFoundError,
  GeneratorNotInstalledError,
  GeneratorValidationError,
  PluginLoadError,
  PluginInstallError,
  GeneratorExecutionError,
} from './lib/core/errors';

// Export the bundled generator for reference
export { OpenAPIToolsGenerator } from './lib/bundled/openapi-tools/generator';
export { OpenAPIToolsCommandBuilder } from './lib/bundled/openapi-tools/command-builder';