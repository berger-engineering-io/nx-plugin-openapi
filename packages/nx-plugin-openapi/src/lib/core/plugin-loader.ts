import { logger } from '@nx/devkit';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { GeneratorPlugin, PluginDiscoveryResult } from './interfaces';
import { 
  PluginLoadError, 
  PluginInterfaceError,
  FileSystemError 
} from './errors';
import { AutoInstaller, InstallOptions } from './auto-installer';

/**
 * Configuration options for the PluginLoader
 */
export interface PluginLoaderOptions {
  /**
   * Enable automatic installation of missing plugins
   */
  autoInstall?: boolean;

  /**
   * Skip interactive prompts (useful for CI environments)
   */
  skipPrompts?: boolean;

  /**
   * Install options to pass to the auto-installer
   */
  installOptions?: InstallOptions;
}

/**
 * Loader for dynamically loading generator plugins
 */
export class PluginLoader {
  private readonly loadedPlugins = new Map<string, PluginDiscoveryResult>();
  private readonly moduleCache = new Map<string, any>();
  private readonly autoInstaller: AutoInstaller;
  private readonly options: PluginLoaderOptions;

  constructor(options: PluginLoaderOptions = {}) {
    this.options = {
      autoInstall: false,
      skipPrompts: false,
      ...options
    };
    this.autoInstaller = new AutoInstaller();
  }

  /**
   * Load a plugin from a package name or file path
   */
  public async loadPlugin(packageNameOrPath: string): Promise<PluginDiscoveryResult> {
    // Check cache first
    if (this.loadedPlugins.has(packageNameOrPath)) {
      return this.loadedPlugins.get(packageNameOrPath)!;
    }

    try {
      logger.verbose(`Loading plugin: ${packageNameOrPath}`);
      
      let modulePath: string;
      let source: 'bundled' | 'npm' | 'local';
      let version: string | undefined;

      // Determine if this is a file path or package name
      if (this.isFilePath(packageNameOrPath)) {
        modulePath = resolve(packageNameOrPath);
        source = 'local';
      } else {
        // Try to resolve as npm package
        try {
          modulePath = this.resolvePackage(packageNameOrPath);
          source = 'npm';
          version = await this.getPackageVersion(packageNameOrPath);
        } catch (resolveError) {
          // If package resolution fails and auto-install is enabled, try to install
          if (this.options.autoInstall || !this.options.skipPrompts) {
            const installResult = await this.tryAutoInstall(packageNameOrPath);
            if (!installResult.success) {
              throw resolveError;
            }

            // Retry resolution after successful installation
            modulePath = this.resolvePackage(packageNameOrPath);
            source = 'npm';
            version = await this.getPackageVersion(packageNameOrPath);
          } else {
            throw resolveError;
          }
        }
      }

      // Load the module
      const pluginModule = await this.loadModule(modulePath);
      
      // Extract the plugin instance
      const plugin = this.extractPlugin(pluginModule, packageNameOrPath);
      
      // Validate the plugin interface
      this.validatePlugin(plugin, packageNameOrPath);

      const result: PluginDiscoveryResult = {
        plugin,
        source,
        version,
        path: modulePath,
      };

      // Cache the result
      this.loadedPlugins.set(packageNameOrPath, result);
      
      logger.verbose(`Successfully loaded plugin: ${plugin.name} from ${packageNameOrPath}`);
      return result;

    } catch (error) {
      logger.error(`Failed to load plugin: ${packageNameOrPath}`);
      if (error instanceof PluginLoadError || error instanceof PluginInterfaceError) {
        throw error;
      }
      throw new PluginLoadError(packageNameOrPath, error as Error);
    }
  }

  /**
   * Try to auto-install a missing plugin
   */
  private async tryAutoInstall(packageName: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`Plugin "${packageName}" not found. Checking for auto-installation options...`);

      // Build install options from loader options
      const installOptions: InstallOptions = {
        ...this.options.installOptions,
        autoInstall: this.options.autoInstall
      };

      const result = await this.autoInstaller.installPlugin(packageName, installOptions);
      
      if (result.success) {
        logger.info(`Successfully installed plugin: ${packageName}`);
        return { success: true };
      } else if (result.cancelled) {
        logger.info(`Installation of plugin "${packageName}" was cancelled by user`);
        return { success: false, error: 'Installation cancelled by user' };
      } else {
        logger.error(`Failed to install plugin "${packageName}": ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Auto-installation failed for "${packageName}": ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Discover plugins in a directory (typically node_modules)
   */
  public async discoverPlugins(searchPath: string): Promise<PluginDiscoveryResult[]> {
    const results: PluginDiscoveryResult[] = [];
    
    try {
      if (!existsSync(searchPath)) {
        logger.verbose(`Search path does not exist: ${searchPath}`);
        return results;
      }

      logger.verbose(`Discovering plugins in: ${searchPath}`);
      
      const entries = readdirSync(searchPath);
      
      for (const entry of entries) {
        const entryPath = join(searchPath, entry);
        
        try {
          // Skip non-directories
          if (!statSync(entryPath).isDirectory()) {
            continue;
          }

          // Check if this looks like a generator plugin package
          if (this.isGeneratorPlugin(entryPath)) {
            const pluginResult = await this.loadPlugin(entryPath);
            results.push(pluginResult);
          }

          // Handle scoped packages (e.g., @company/plugin-name)
          if (entry.startsWith('@')) {
            const scopedEntries = readdirSync(entryPath);
            for (const scopedEntry of scopedEntries) {
              const scopedPath = join(entryPath, scopedEntry);
              if (statSync(scopedPath).isDirectory() && this.isGeneratorPlugin(scopedPath)) {
                const pluginResult = await this.loadPlugin(scopedPath);
                results.push(pluginResult);
              }
            }
          }
        } catch (error) {
          logger.verbose(`Skipping ${entry}: ${error}`);
        }
      }

      logger.verbose(`Discovered ${results.length} plugins in ${searchPath}`);
      return results;

    } catch (error) {
      throw new FileSystemError('discover plugins', searchPath, error as Error);
    }
  }

  /**
   * Validate that a plugin implements the GeneratorPlugin interface
   */
  public validatePlugin(plugin: any, packageName: string): void {
    const requiredMethods = [
      'generate',
      'getSupportedTypes',
      'getSchema',
      'validate',
    ];
    
    const requiredProperties = [
      'name',
      'displayName',
      'packageName',
    ];

    const missingMethods: string[] = [];
    const invalidMethods: string[] = [];
    const missingProperties: string[] = [];

    // Check required properties
    for (const prop of requiredProperties) {
      if (!(prop in plugin) || typeof plugin[prop] !== 'string') {
        missingProperties.push(prop);
      }
    }

    // Check required methods
    for (const method of requiredMethods) {
      if (!(method in plugin)) {
        missingMethods.push(method);
      } else if (typeof plugin[method] !== 'function') {
        invalidMethods.push(method);
      }
    }

    const allMissing = [...missingMethods, ...missingProperties];
    if (allMissing.length > 0 || invalidMethods.length > 0) {
      throw new PluginInterfaceError(packageName, allMissing, invalidMethods);
    }
  }

  /**
   * Clear the plugin cache
   */
  public clearCache(): void {
    this.loadedPlugins.clear();
    this.moduleCache.clear();
    logger.verbose('Plugin cache cleared');
  }

  /**
   * Get statistics about loaded plugins
   */
  public getStats(): {
    loadedPlugins: number;
    cachedModules: number;
    pluginsBySource: Record<string, number>;
  } {
    const pluginsBySource: Record<string, number> = {
      bundled: 0,
      npm: 0,
      local: 0,
    };

    for (const result of this.loadedPlugins.values()) {
      pluginsBySource[result.source] = (pluginsBySource[result.source] || 0) + 1;
    }

    return {
      loadedPlugins: this.loadedPlugins.size,
      cachedModules: this.moduleCache.size,
      pluginsBySource,
    };
  }

  /**
   * Check if a string looks like a file path
   */
  private isFilePath(str: string): boolean {
    return str.startsWith('./') || 
           str.startsWith('../') || 
           str.startsWith('/') || 
           str.includes('\\');
  }

  /**
   * Resolve a package name to its main module path
   */
  private resolvePackage(packageName: string): string {
    try {
      // Use require.resolve to find the package
      return require.resolve(packageName);
    } catch (error) {
      // Try alternative resolution strategies
      const alternativePaths = [
        join(process.cwd(), 'node_modules', packageName),
        join(process.cwd(), 'node_modules', packageName, 'index.js'),
        join(process.cwd(), 'node_modules', packageName, 'lib', 'index.js'),
        join(process.cwd(), 'node_modules', packageName, 'dist', 'index.js'),
      ];

      for (const path of alternativePaths) {
        if (existsSync(path)) {
          return path;
        }
      }

      throw new Error(`Cannot resolve package: ${packageName}`);
    }
  }

  /**
   * Load a module and handle caching
   */
  private async loadModule(modulePath: string): Promise<any> {
    if (this.moduleCache.has(modulePath)) {
      return this.moduleCache.get(modulePath);
    }

    try {
      // Clear require cache to ensure fresh load
      delete require.cache[require.resolve(modulePath)];
      
      const module = require(modulePath); // eslint-disable-line @typescript-eslint/no-require-imports
      this.moduleCache.set(modulePath, module);
      
      return module;
    } catch (error) {
      throw new Error(`Failed to load module from ${modulePath}: ${error}`);
    }
  }

  /**
   * Extract the plugin instance from a loaded module
   */
  private extractPlugin(pluginModule: any, packageName: string): GeneratorPlugin {
    // Try different export patterns
    if (pluginModule && typeof pluginModule === 'object') {
      // Named export: { MyGenerator: ... }
      const namedExports = Object.values(pluginModule);
      const possiblePlugins = namedExports.filter(exp => 
        exp && typeof exp === 'object' && 'generate' in exp
      );
      
      if (possiblePlugins.length === 1) {
        return possiblePlugins[0] as GeneratorPlugin;
      }
      
      // Default export: { default: ... }
      if (pluginModule.default && typeof pluginModule.default === 'object') {
        return pluginModule.default as GeneratorPlugin;
      }
      
      // Direct object export
      if ('generate' in pluginModule) {
        return pluginModule as GeneratorPlugin;
      }
    }

    // Class constructor export
    if (typeof pluginModule === 'function') {
      try {
        return new pluginModule() as GeneratorPlugin;
      } catch (error) {
        throw new Error(`Failed to instantiate plugin class: ${error}`);
      }
    }

    throw new Error(`Cannot extract plugin from module ${packageName}. Expected object with generate method or class constructor.`);
  }

  /**
   * Check if a directory contains a generator plugin
   */
  private isGeneratorPlugin(packagePath: string): boolean {
    try {
      // Check for package.json
      const packageJsonPath = join(packagePath, 'package.json');
      if (!existsSync(packageJsonPath)) {
        return false;
      }

      // Read package.json
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      // Check for generator-related keywords
      const keywords = packageJson.keywords || [];
      const hasGeneratorKeywords = keywords.some((keyword: string) => 
        keyword.includes('openapi') || 
        keyword.includes('generator') || 
        keyword.includes('codegen')
      );

      // Check for nx-plugin-openapi related names
      const isRelatedPackage = 
        packageJson.name?.includes('nx-plugin-openapi') ||
        packageJson.name?.includes('openapi-generator') ||
        packageJson.description?.includes('OpenAPI generator');

      return hasGeneratorKeywords || isRelatedPackage;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the version of a package
   */
  private async getPackageVersion(packageName: string): Promise<string | undefined> {
    try {
      const packageJsonPath = join(this.resolvePackage(packageName), '..', 'package.json');
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        return packageJson.version;
      }
    } catch (error) {
      logger.verbose(`Could not determine version for package: ${packageName}`);
    }
    return undefined;
  }
}