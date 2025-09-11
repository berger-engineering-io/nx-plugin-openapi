import { GeneratorPlugin } from './interfaces';
import { PluginNotFoundError } from './errors';

export class GeneratorRegistry {
  private static _instance: GeneratorRegistry | null = null;
  static instance(): GeneratorRegistry {
    if (!this._instance) this._instance = new GeneratorRegistry();
    return this._instance;
  }

  private plugins = new Map<string, GeneratorPlugin>();

  register(plugin: GeneratorPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  get(name: string): GeneratorPlugin {
    const plugin = this.plugins.get(name);
    if (!plugin) throw new PluginNotFoundError(name);
    return plugin;
  }

  list(): string[] {
    return Array.from(this.plugins.keys());
  }
}
