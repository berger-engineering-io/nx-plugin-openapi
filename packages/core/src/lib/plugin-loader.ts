import { GeneratorPlugin } from './interfaces';
import { PluginLoadError, PluginNotFoundError } from './errors';
import { GeneratorRegistry } from './registry';
import { isGeneratorPlugin } from './type-guards';
import { logger } from '@nx/devkit';

const BUILTIN_PLUGIN_MAP: Record<string, string> = {
  'openapi-tools': '@nx-plugin-openapi/plugin-openapi',
  'hey-openapi': '@nx-plugin-openapi/plugin-hey-openapi',
};

const cache = new Map<string, GeneratorPlugin>();

export async function loadPlugin(
  name: string,
  opts?: { root?: string }
): Promise<GeneratorPlugin> {
  logger.debug(`Loading plugin: ${name}`);

  // Check registry first
  if (GeneratorRegistry.instance().has(name)) {
    logger.debug(`Plugin ${name} found in registry`);
    return GeneratorRegistry.instance().get(name);
  }

  // Check cache
  const cached = cache.get(name);
  if (cached) {
    logger.debug(`Plugin ${name} found in cache`);
    return cached;
  }

  const pkg = BUILTIN_PLUGIN_MAP[name] ?? name;
  const searchPaths: string[] = [pkg];

  logger.debug(`Attempting to load plugin from package: ${pkg}`);

  try {
    const mod = (await import(pkg)) as {
      default?: unknown;
      createPlugin?: unknown;
      plugin?: unknown;
      Plugin?: unknown;
    };

    logger.debug(`Successfully imported module: ${pkg}`);

    let candidate: unknown = undefined;

    // Try different export patterns
    if (isGeneratorPlugin(mod.default)) {
      logger.debug(`Found plugin as default export`);
      candidate = mod.default;
    } else if (typeof mod.createPlugin === 'function') {
      logger.debug(`Found createPlugin factory function`);
      candidate = (mod.createPlugin as () => unknown)();
    } else if (isGeneratorPlugin(mod.plugin)) {
      logger.debug(`Found plugin as named export 'plugin'`);
      candidate = mod.plugin;
    } else if (isGeneratorPlugin(mod.Plugin)) {
      logger.debug(`Found plugin as named export 'Plugin'`);
      candidate = mod.Plugin;
    }

    if (!isGeneratorPlugin(candidate)) {
      const availableExports = Object.keys(mod).filter(
        (k) => k !== '__esModule'
      );
      throw new PluginLoadError(
        name,
        new Error(
          `Module does not export a valid plugin. Available exports: ${availableExports.join(
            ', '
          )}`
        )
      );
    }

    logger.info(`Successfully loaded plugin: ${name}`);
    cache.set(name, candidate);
    return candidate;
  } catch (e) {
    logger.debug(`Failed to load plugin from primary path: ${e}`);

    // Fallback to workspace-relative resolution if provided
    const root = opts?.root ?? process.cwd();

    if (
      pkg === '@nx-plugin-openapi/plugin-openapi' ||
      pkg === '@nx-plugin-openapi/plugin-hey-openapi'
    ) {
      const pkgName = pkg.split('/').pop()!; // e.g., 'plugin-openapi' or 'plugin-hey-openapi'
      const fallbackPaths = [
        `${root}/dist/packages/${pkgName}/src/index.js`,
        `${root}/packages/${pkgName}/src/index.js`,
      ];
      searchPaths.push(...fallbackPaths);

      logger.debug(`Trying fallback paths for built-in plugin`);

      for (const p of fallbackPaths) {
        try {
          logger.debug(`Attempting to load from: ${p}`);
          const { pathToFileURL } = await import('node:url');
          const url = pathToFileURL(p).href;
          const mod2 = (await import(url)) as { default?: unknown };

          if (isGeneratorPlugin(mod2?.default)) {
            const plugin2 = mod2.default;
            logger.info(`Successfully loaded plugin from fallback path: ${p}`);
            cache.set(name, plugin2);
            return plugin2;
          }
        } catch (fallbackError) {
          logger.debug(`Failed to load from ${p}: ${fallbackError}`);
        }
      }
    }

    // Determine appropriate error type
    const msg = String(e);
    const code = (e as Record<string, unknown>)?.['code'];

    if (code === 'ERR_MODULE_NOT_FOUND' || /Cannot find module/.test(msg)) {
      logger.error(
        `Plugin not found: ${name}. Searched paths: ${JSON.stringify(
          searchPaths
        )}`
      );
      throw new PluginNotFoundError(name, searchPaths);
    }

    logger.error(`Failed to load plugin: ${name}. Error: ${e}`);
    throw new PluginLoadError(name, e);
  }
}
