/**
 * Dynamic plugin loading system
 * Handles loading, validating, and instantiating generator plugins
 */

import { resolve, join } from 'path';
import { PluginModule, GeneratorPlugin, PluginMetadata, PluginLoadOptions, Logger } from './interfaces';
import { PluginLoadError, PluginNotFoundError, PluginValidationError } from './errors';
import { AutoInstaller } from './auto-installer';

export class PluginLoader {
  private readonly loadedPlugins = new Map<string, GeneratorPlugin>();
  private readonly autoInstaller: AutoInstaller;

  constructor(private readonly logger: Logger) {
    this.autoInstaller = new AutoInstaller(logger);
  }

  /**
   * Load a plugin by name or path
   */
  async loadPlugin(nameOrPath: string, options: PluginLoadOptions = {}): Promise<GeneratorPlugin> {
    try {
      this.logger.debug(`Loading plugin: ${nameOrPath}`);

      // Check if already loaded
      if (this.loadedPlugins.has(nameOrPath)) {
        this.logger.debug(`Plugin '${nameOrPath}' already loaded, returning cached instance`);
        return this.loadedPlugins.get(nameOrPath)!;
      }

      // Determine if this is a package name or file path
      const isPackageName = !nameOrPath.startsWith('.') && !nameOrPath.startsWith('/') && !nameOrPath.includes('/');
      
      let pluginModule: PluginModule;

      if (isPackageName) {
        pluginModule = await this.loadPluginPackage(nameOrPath, options);
      } else {
        pluginModule = await this.loadPluginFromPath(nameOrPath);
      }

      // Validate the plugin module
      this.validatePluginModule(pluginModule, nameOrPath);

      // Create plugin instance
      const plugin = await this.createPluginInstance(pluginModule, nameOrPath, options);

      // Validate the plugin instance
      await this.validatePluginInstance(plugin);

      // Cache the loaded plugin
      this.loadedPlugins.set(nameOrPath, plugin);

      this.logger.info(`Successfully loaded plugin: ${plugin.name} v${plugin.version}`);
      return plugin;

    } catch (error) {
      this.logger.error(`Failed to load plugin '${nameOrPath}': ${error instanceof Error ? error.message : String(error)}`);
      
      if (error instanceof PluginLoadError || error instanceof PluginNotFoundError) {
        throw error;
      }
      
      throw new PluginLoadError(nameOrPath, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Load a plugin from an npm package
   */
  private async loadPluginPackage(packageName: string, options: PluginLoadOptions): Promise<PluginModule> {
    try {
      // Try to require the package
      return await this.requirePlugin(packageName);
    } catch (error) {
      // If auto-install is enabled, try to install the package
      if (options.autoInstall) {
        this.logger.info(`Plugin package '${packageName}' not found, attempting auto-installation...`);
        
        try {
          await this.autoInstaller.installPackage(packageName, {
            registry: options.registry,
            packageManager: await AutoInstaller.detectPackageManager()
          });
          
          // Try to load again after installation
          return await this.requirePlugin(packageName);
        } catch (installError) {
          this.logger.error(`Auto-installation of '${packageName}' failed: ${installError instanceof Error ? installError.message : String(installError)}`);
          throw new PluginNotFoundError(packageName);
        }
      }
      
      throw new PluginNotFoundError(packageName);
    }
  }

  /**
   * Load a plugin from a file path
   */
  private async loadPluginFromPath(filePath: string): Promise<PluginModule> {
    try {
      const resolvedPath = resolve(filePath);
      this.logger.debug(`Loading plugin from path: ${resolvedPath}`);
      
      // Clear require cache to ensure fresh load
      delete require.cache[resolvedPath];
      
      return await import(resolvedPath);
    } catch (error) {
      throw new PluginLoadError(filePath, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Require a plugin module with error handling
   */
  private async requirePlugin(packageName: string): Promise<PluginModule> {
    try {
      // Try direct require first
      return require(packageName);
    } catch (error) {
      // Try with common plugin path patterns
      const patterns = [
        packageName,
        `${packageName}/plugin`,
        `${packageName}/lib/plugin`,
        `${packageName}/dist/plugin`,
        `${packageName}/src/plugin`
      ];

      for (const pattern of patterns) {
        try {
          this.logger.debug(`Trying to load plugin with pattern: ${pattern}`);
          return require(pattern);
        } catch {
          // Continue to next pattern
        }
      }

      throw error;
    }
  }

  /**
   * Validate that a loaded module is a valid plugin
   */
  private validatePluginModule(pluginModule: unknown, nameOrPath: string): asserts pluginModule is PluginModule {
    if (!pluginModule || typeof pluginModule !== 'object') {
      throw new PluginValidationError(nameOrPath, ['Plugin module must export an object']);
    }

    const module = pluginModule as Record<string, unknown>;
    
    if (!module['default'] || typeof module['default'] !== 'function') {
      throw new PluginValidationError(nameOrPath, ['Plugin module must have a default export that is a function']);
    }
  }

  /**
   * Create an instance of the plugin from the module
   */
  private async createPluginInstance(
    pluginModule: PluginModule, 
    nameOrPath: string, 
    options: PluginLoadOptions
  ): Promise<GeneratorPlugin> {
    try {
      const plugin = await pluginModule.default(options);
      
      if (!plugin) {
        throw new PluginValidationError(nameOrPath, ['Plugin factory returned null or undefined']);
      }

      return plugin;
    } catch (error) {
      throw new PluginLoadError(nameOrPath, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Validate that a plugin instance implements the required interface
   */
  private async validatePluginInstance(plugin: GeneratorPlugin): Promise<void> {
    const errors: string[] = [];

    // Check required properties
    if (!plugin.name || typeof plugin.name !== 'string') {
      errors.push('Plugin must have a name property (string)');
    }

    if (!plugin.version || typeof plugin.version !== 'string') {
      errors.push('Plugin must have a version property (string)');
    }

    if (!Array.isArray(plugin.supportedFileTypes)) {
      errors.push('Plugin must have a supportedFileTypes property (array)');
    }

    if (!Array.isArray(plugin.requiredOptions)) {
      errors.push('Plugin must have a requiredOptions property (array)');
    }

    // Check required methods
    if (typeof plugin.generate !== 'function') {
      errors.push('Plugin must implement generate method');
    }

    if (typeof plugin.validate !== 'function') {
      errors.push('Plugin must implement validate method');
    }

    if (typeof plugin.getSchema !== 'function') {
      errors.push('Plugin must implement getSchema method');
    }

    if (errors.length > 0) {
      throw new PluginValidationError(plugin.name || 'unknown', errors);
    }
  }

  /**
   * Unload a plugin from cache
   */
  unloadPlugin(nameOrPath: string): boolean {
    if (this.loadedPlugins.has(nameOrPath)) {
      this.loadedPlugins.delete(nameOrPath);
      this.logger.debug(`Unloaded plugin: ${nameOrPath}`);
      return true;
    }
    return false;
  }

  /**
   * Clear all loaded plugins from cache
   */
  clearCache(): void {
    const count = this.loadedPlugins.size;
    this.loadedPlugins.clear();
    this.logger.debug(`Cleared plugin cache (${count} plugins removed)`);
  }

  /**
   * Get all currently loaded plugins
   */
  getLoadedPlugins(): ReadonlyMap<string, GeneratorPlugin> {
    return new Map(this.loadedPlugins);
  }

  /**
   * Check if a plugin is already loaded
   */
  isPluginLoaded(nameOrPath: string): boolean {
    return this.loadedPlugins.has(nameOrPath);
  }

  /**
   * Get plugin metadata without fully loading the plugin
   */
  async getPluginMetadata(nameOrPath: string): Promise<PluginMetadata | null> {
    try {
      // If already loaded, get metadata from loaded plugin
      if (this.loadedPlugins.has(nameOrPath)) {
        const plugin = this.loadedPlugins.get(nameOrPath)!;
        return {
          name: plugin.name,
          version: plugin.version,
          packageName: nameOrPath,
          description: plugin.description,
          supportedFileTypes: plugin.supportedFileTypes,
          requiredOptions: plugin.requiredOptions,
          isInstalled: true,
          installationPath: (await this.autoInstaller.getPackageInstallationPath(nameOrPath)) || undefined
        };
      }

      // Try to load module metadata without creating instance
      const pluginModule = await this.loadPluginFromPath(nameOrPath);
      
      if (pluginModule.metadata) {
        return {
          ...pluginModule.metadata,
          packageName: nameOrPath,
          isInstalled: true,
          installationPath: (await this.autoInstaller.getPackageInstallationPath(nameOrPath)) || undefined
        } as PluginMetadata;
      }

      return null;
    } catch {
      return null;
    }
  }
}