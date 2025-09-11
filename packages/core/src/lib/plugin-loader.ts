import { GeneratorPlugin } from './interfaces';
import { PluginLoadError, PluginNotFoundError } from './errors';
import { GeneratorRegistry } from './registry';

const BUILTIN_PLUGIN_MAP: Record<string, string> = {
  'openapi-tools': '@nx-plugin-openapi/plugin-openapi',
};

const cache = new Map<string, GeneratorPlugin>();

export async function loadPlugin(name: string): Promise<GeneratorPlugin> {
  if (GeneratorRegistry.instance().has(name)) {
    return GeneratorRegistry.instance().get(name);
  }
  if (cache.has(name)) return cache.get(name)!;

  const pkg = BUILTIN_PLUGIN_MAP[name] ?? name;
  try {
    // Prefer ESM dynamic import, fallback to require
    let mod: any;
    try {
      mod = await import(pkg);
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      mod = require(pkg);
    }
    const plugin: GeneratorPlugin =
      mod?.default?.name && typeof mod.default.generate === 'function'
        ? mod.default
        : typeof mod.createPlugin === 'function'
        ? mod.createPlugin()
        : mod?.plugin || mod?.Plugin || mod;

    if (!plugin || typeof plugin.generate !== 'function') {
      throw new PluginLoadError(
        name,
        new Error('Module does not export a plugin')
      );
    }

    cache.set(name, plugin);
    return plugin;
  } catch (e) {
    if (
      (e as any).code === 'ERR_MODULE_NOT_FOUND' ||
      /Cannot find module/.test(String(e))
    ) {
      throw new PluginNotFoundError(name);
    }
    throw new PluginLoadError(name, e);
  }
}
