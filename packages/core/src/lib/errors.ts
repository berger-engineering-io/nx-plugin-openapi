/**
 * Custom error classes for the nx-plugin-openapi core system
 */

export class PluginError extends Error {
  constructor(message: string, public readonly pluginName?: string) {
    super(message);
    this.name = 'PluginError';
    Object.setPrototypeOf(this, PluginError.prototype);
  }
}

export class PluginNotFoundError extends PluginError {
  constructor(pluginName: string) {
    super(`Plugin '${pluginName}' not found`, pluginName);
    this.name = 'PluginNotFoundError';
    Object.setPrototypeOf(this, PluginNotFoundError.prototype);
  }
}

export class PluginLoadError extends PluginError {
  public readonly cause: Error;
  
  constructor(pluginName: string, cause: Error) {
    super(`Failed to load plugin '${pluginName}': ${cause.message}`, pluginName);
    this.name = 'PluginLoadError';
    this.cause = cause;
    Object.setPrototypeOf(this, PluginLoadError.prototype);
  }
}

export class PluginValidationError extends PluginError {
  constructor(pluginName: string, validationErrors: string[]) {
    super(`Plugin '${pluginName}' validation failed: ${validationErrors.join(', ')}`, pluginName);
    this.name = 'PluginValidationError';
    Object.setPrototypeOf(this, PluginValidationError.prototype);
  }
}

export class PluginInstallationError extends PluginError {
  public readonly cause: Error;
  
  constructor(pluginName: string, cause: Error) {
    super(`Failed to install plugin '${pluginName}': ${cause.message}`, pluginName);
    this.name = 'PluginInstallationError';
    this.cause = cause;
    Object.setPrototypeOf(this, PluginInstallationError.prototype);
  }
}

export class GeneratorExecutionError extends PluginError {
  public readonly cause: Error;
  
  constructor(pluginName: string, cause: Error) {
    super(`Generator execution failed for plugin '${pluginName}': ${cause.message}`, pluginName);
    this.name = 'GeneratorExecutionError';
    this.cause = cause;
    Object.setPrototypeOf(this, GeneratorExecutionError.prototype);
  }
}

export class InvalidOptionsError extends Error {
  constructor(message: string, public readonly invalidOptions: string[]) {
    super(message);
    this.name = 'InvalidOptionsError';
    Object.setPrototypeOf(this, InvalidOptionsError.prototype);
  }
}

export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryError';
    Object.setPrototypeOf(this, RegistryError.prototype);
  }
}

export class AutoInstallerError extends Error {
  constructor(message: string, public readonly packageName?: string) {
    super(message);
    this.name = 'AutoInstallerError';
    Object.setPrototypeOf(this, AutoInstallerError.prototype);
  }
}