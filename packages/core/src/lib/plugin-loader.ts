import { GeneratorPlugin } from './interfaces';
import { PluginLoadError, PluginNotFoundError } from './errors';
import { GeneratorRegistry } from './registry';
import { isGeneratorPlugin } from './type-guards';
import { logger } from '@nx/devkit';
import { detectCi, installPackages } from './auto-installer';
import { isLocalDev } from './utils/is-local-dev';

const BUILTIN_PLUGIN_MAP: Record<string, string> = {
  'openapi-tools': '@nx-plugin-openapi/plugin-openapi',
  'hey-api': '@nx-plugin-openapi/plugin-hey-api',
};

const cache = new Map<string, GeneratorPlugin>();

/**
 * Helper function to determine if auto-installation should be attempted
 */
function shouldTryAutoInstall(error: unknown, packageName: string): boolean {
  const msg = String(error);
  const code = (error as Record<string, unknown>)?.['code'];

  return (
    // Only for module not found errors
    (code === 'ERR_MODULE_NOT_FOUND' || /Cannot find module/.test(msg)) &&
    // Only for known plugin packages
    packageName.startsWith('@nx-plugin-openapi/') &&
    // Not in CI environment
    !detectCi()
  );
}

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

  // Helper function to load plugin from module
  async function loadFromModule(mod: {
    default?: unknown;
    createPlugin?: unknown;
    plugin?: unknown;
    Plugin?: unknown;
  }): Promise<GeneratorPlugin> {
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

    return candidate;
  }

  // 1. First try to load from node_modules (already installed packages)
  try {
    const mod = await import(pkg);
    logger.debug(`Successfully imported module from node_modules: ${pkg}`);

    const plugin = await loadFromModule(mod);
    logger.info(`Successfully loaded plugin from installed package: ${name}`);
    cache.set(name, plugin);
    return plugin;
  } catch (e) {
    const msg = String(e);
    const code = (e as Record<string, unknown>)?.['code'];
    const isModuleNotFound =
      code === 'ERR_MODULE_NOT_FOUND' || /Cannot find module/.test(msg);

    logger.debug(`Failed to load plugin from node_modules: ${e}`);

    // 2. If module not found and auto-install conditions are met, try auto-installation
    if (isModuleNotFound && shouldTryAutoInstall(e, pkg)) {
      logger.info(
        `Plugin ${pkg} not found in node_modules. Attempting to auto-install...`
      );
      try {
        installPackages([pkg], { dev: true });
        logger.info(`Successfully installed ${pkg}, loading plugin...`);

        // Retry the import after installation
        const retryMod = await import(pkg);
        const plugin = await loadFromModule(retryMod);

        logger.info(
          `Successfully loaded plugin after auto-installation: ${name}`
        );
        cache.set(name, plugin);
        return plugin;
      } catch (installError) {
        logger.warn(`Auto-installation failed for ${pkg}: ${installError}`);
        // Continue to fallback paths for local development
      }
    }

    // 3. For local development only: try fallback paths
    const root = opts?.root ?? process.cwd();
    const isLocal = isLocalDev();

    if (
      isLocal &&
      (pkg === '@nx-plugin-openapi/plugin-openapi' ||
        pkg === '@nx-plugin-openapi/plugin-hey-api')
    ) {
      const pkgName = pkg.split('/').pop() ?? '';
      const fallbackPaths = [
        `${root}/dist/packages/${pkgName}/src/index.js`,
        `${root}/packages/${pkgName}/src/index.js`,
      ];
      searchPaths.push(...fallbackPaths);

      logger.debug(`[Local Dev] Trying fallback paths for built-in plugin`);

      for (const p of fallbackPaths) {
        try {
          logger.debug(`[Local Dev] Attempting to load from: ${p}`);
          const { pathToFileURL } = await import('node:url');
          const url = pathToFileURL(p).href;
          const mod2 = (await import(url)) as { default?: unknown };

          if (isGeneratorPlugin(mod2?.default)) {
            const plugin2 = mod2.default;
            logger.info(
              `[Local Dev] Successfully loaded plugin from fallback path: ${p}`
            );
            cache.set(name, plugin2);
            return plugin2;
          }
        } catch (fallbackError) {
          logger.debug(
            `[Local Dev] Failed to load from ${p}: ${fallbackError}`
          );
        }
      }
    }

    // 4. If all attempts failed, throw appropriate error
    if (isModuleNotFound) {
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
