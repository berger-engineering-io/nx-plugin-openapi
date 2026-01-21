import { GeneratorPlugin } from './interfaces';
import { PluginLoadError, PluginNotFoundError } from './errors';
import { GeneratorRegistry } from './registry';
import { isGeneratorPlugin } from './type-guards';
import { logger } from '@nx/devkit';
import {
  detectCi,
  detectPackageManager,
  installPackages,
} from './auto-installer';
import { isLocalDev } from './utils/is-local-dev';
import * as readline from 'node:readline';

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

/**
 * Extracts a clean error message without stack trace for user-facing logs.
 * Full error details are logged via logger.debug for verbose mode.
 */
function getCleanErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Prompts the user for confirmation before auto-installing a package.
 * Returns true if user confirms (y/Y/yes), false otherwise.
 * In non-interactive environments, returns false.
 */
async function promptForInstall(packageName: string): Promise<boolean> {
  // Check if stdin is a TTY (interactive terminal)
  if (!process.stdin.isTTY) {
    logger.debug('Non-interactive environment detected, skipping prompt');
    return false;
  }

  const pm = detectPackageManager();

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      `\nPlugin '${packageName}' is not installed.\nWould you like to install it using ${pm}? (y/n) `,
      (answer) => {
        rl.close();
        const normalizedAnswer = answer.trim().toLowerCase();
        resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes');
      }
    );
  });
}

export async function loadPlugin(
  name: string,
  opts?: { root?: string; skipPrompt?: boolean }
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

    // Log clean message for users, full details in debug mode
    logger.debug(`Failed to load plugin from node_modules: ${e}`);

    // 2. If module not found and auto-install conditions are met, try auto-installation
    if (isModuleNotFound && shouldTryAutoInstall(e, pkg)) {
      // Prompt user for confirmation (unless skipped via option)
      const shouldInstall = opts?.skipPrompt
        ? true
        : await promptForInstall(pkg);

      if (shouldInstall) {
        const pm = detectPackageManager();
        logger.info(`Installing ${pkg} using ${pm}...`);
        try {
          installPackages([pkg], { dev: true });
          logger.info(`Successfully installed ${pkg}`);

          // Retry the import after installation
          const retryMod = await import(pkg);
          const plugin = await loadFromModule(retryMod);

          logger.info(`Successfully loaded plugin: ${name}`);
          cache.set(name, plugin);
          return plugin;
        } catch (installError) {
          // Show clean message to user, full details in debug
          logger.debug(`Full installation error: ${installError}`);
          logger.warn(
            `Auto-installation failed for ${pkg}: ${getCleanErrorMessage(installError)}`
          );
          // Continue to fallback paths for local development
        }
      } else {
        logger.info(`Skipping installation of ${pkg}`);
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
      // User-friendly message without technical details
      logger.error(`Plugin not found: ${name}`);
      logger.debug(`Searched paths: ${JSON.stringify(searchPaths)}`);
      throw new PluginNotFoundError(name, searchPaths);
    }

    // User-friendly error, full details in debug
    logger.error(`Failed to load plugin: ${name}. ${getCleanErrorMessage(e)}`);
    logger.debug(`Full error details: ${e}`);
    throw new PluginLoadError(name, e);
  }
}
