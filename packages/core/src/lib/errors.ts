export class CoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PluginNotFoundError extends CoreError {
  constructor(public pluginName: string) {
    super(`Generator plugin not found: ${pluginName}`);
  }
}

export class PluginLoadError extends CoreError {
  constructor(public pluginName: string, public cause?: unknown) {
    super(`Failed to load generator plugin: ${pluginName}`);
  }
}

export class ValidationError extends CoreError {}
