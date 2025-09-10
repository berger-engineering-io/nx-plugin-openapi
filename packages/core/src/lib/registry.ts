/**
 * Plugin registry singleton that manages available generator plugins
 * Provides centralized access to plugin discovery, loading, and management
 */

import { 
  GeneratorPlugin, 
  PluginMetadata, 
  PluginRegistryOptions, 
  PluginLoadOptions, 
  Logger,
  GeneratorOptions,
  GeneratorContext,
  GeneratorResult
} from './interfaces';
import { PluginLoader } from './plugin-loader';
import { RegistryError, PluginNotFoundError } from './errors';

export class PluginRegistry {
  private static instance: PluginRegistry | null = null;
  private readonly pluginLoader: PluginLoader;
  private readonly registeredPlugins = new Map<string, PluginMetadata>();
  private readonly pluginAliases = new Map<string, string>();
  private readonly options: Required<PluginRegistryOptions>;

  private constructor(
    private readonly logger: Logger,
    options: PluginRegistryOptions = {}
  ) {
    this.options = {
      autoInstall: options.autoInstall ?? true,
      registryUrl: options.registryUrl ?? 'https://registry.npmjs.org',
      cacheDirectory: options.cacheDirectory ?? '.nx-plugin-cache',
      timeout: options.timeout ?? 30000
    };
    
    this.pluginLoader = new PluginLoader(logger);
    this.initializeBuiltinPlugins();
  }

  /**
   * Get the singleton instance of the plugin registry
   */
  static getInstance(logger?: Logger, options?: PluginRegistryOptions): PluginRegistry {
    if (!PluginRegistry.instance) {
      if (!logger) {
        throw new RegistryError('Logger is required when creating the first instance of PluginRegistry');
      }
      PluginRegistry.instance = new PluginRegistry(logger, options);
    }
    return PluginRegistry.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  static resetInstance(): void {
    PluginRegistry.instance = null;
  }

  /**
   * Register a plugin in the registry
   */
  registerPlugin(metadata: PluginMetadata): void {
    this.logger.debug(`Registering plugin: ${metadata.name} v${metadata.version}`);
    
    // Validate metadata
    this.validatePluginMetadata(metadata);
    
    this.registeredPlugins.set(metadata.name, metadata);
    
    this.logger.info(`Registered plugin: ${metadata.name} v${metadata.version}`);
  }

  /**
   * Unregister a plugin from the registry
   */
  unregisterPlugin(pluginName: string): boolean {
    if (this.registeredPlugins.has(pluginName)) {
      this.registeredPlugins.delete(pluginName);
      
      // Also remove any aliases pointing to this plugin
      for (const [alias, target] of this.pluginAliases.entries()) {
        if (target === pluginName) {
          this.pluginAliases.delete(alias);
        }
      }
      
      // Unload from plugin loader cache
      this.pluginLoader.unloadPlugin(pluginName);
      
      this.logger.info(`Unregistered plugin: ${pluginName}`);
      return true;
    }
    
    return false;
  }

  /**
   * Register an alias for a plugin
   */
  registerAlias(alias: string, pluginName: string): void {
    if (!this.registeredPlugins.has(pluginName)) {
      throw new PluginNotFoundError(pluginName);
    }
    
    this.pluginAliases.set(alias, pluginName);
    this.logger.debug(`Registered alias '${alias}' -> '${pluginName}'`);
  }

  /**
   * Get a plugin by name or alias
   */
  async getPlugin(nameOrAlias: string, options: PluginLoadOptions = {}): Promise<GeneratorPlugin> {
    const resolvedName = this.resolvePluginName(nameOrAlias);
    
    this.logger.debug(`Getting plugin: ${nameOrAlias} (resolved to: ${resolvedName})`);
    
    // Load the plugin using the plugin loader
    const loadOptions = { ...options, autoInstall: this.options.autoInstall, ...options };
    return await this.pluginLoader.loadPlugin(resolvedName, loadOptions);
  }

  /**
   * Execute a plugin by name
   */
  async executePlugin(
    nameOrAlias: string, 
    options: GeneratorOptions, 
    context: GeneratorContext,
    loadOptions: PluginLoadOptions = {}
  ): Promise<GeneratorResult> {
    const plugin = await this.getPlugin(nameOrAlias, loadOptions);
    
    // Use the base generator's executeWithValidation if available
    if ('executeWithValidation' in plugin && typeof plugin.executeWithValidation === 'function') {
      return await (plugin as any).executeWithValidation(options, context);
    }
    
    // Fallback to direct execution
    return await plugin.generate(options, context);
  }

  /**
   * List all registered plugins
   */
  listPlugins(): ReadonlyMap<string, PluginMetadata> {
    return new Map(this.registeredPlugins);
  }

  /**
   * List all plugin aliases
   */
  listAliases(): ReadonlyMap<string, string> {
    return new Map(this.pluginAliases);
  }

  /**
   * Search for plugins by criteria
   */
  searchPlugins(criteria: {
    name?: string;
    fileType?: string;
    keywords?: string[];
    installed?: boolean;
  }): PluginMetadata[] {
    const results: PluginMetadata[] = [];
    
    for (const metadata of this.registeredPlugins.values()) {
      let matches = true;
      
      // Name filter (partial match)
      if (criteria.name && !metadata.name.toLowerCase().includes(criteria.name.toLowerCase())) {
        matches = false;
      }
      
      // File type filter
      if (criteria.fileType && !metadata.supportedFileTypes.includes(criteria.fileType)) {
        matches = false;
      }
      
      // Keywords filter
      if (criteria.keywords && criteria.keywords.length > 0) {
        const pluginKeywords = metadata.keywords || [];
        const hasMatchingKeyword = criteria.keywords.some(keyword =>
          pluginKeywords.some(pk => pk.toLowerCase().includes(keyword.toLowerCase()))
        );
        if (!hasMatchingKeyword) {
          matches = false;
        }
      }
      
      // Installation status filter
      if (criteria.installed !== undefined && metadata.isInstalled !== criteria.installed) {
        matches = false;
      }
      
      if (matches) {
        results.push(metadata);
      }
    }
    
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get plugins that support a specific file type
   */
  getPluginsForFileType(fileType: string): PluginMetadata[] {
    return this.searchPlugins({ fileType });
  }

  /**
   * Check if a plugin is registered
   */
  isPluginRegistered(nameOrAlias: string): boolean {
    const resolvedName = this.resolvePluginName(nameOrAlias);
    return this.registeredPlugins.has(resolvedName);
  }

  /**
   * Get plugin metadata
   */
  getPluginMetadata(nameOrAlias: string): PluginMetadata | null {
    const resolvedName = this.resolvePluginName(nameOrAlias);
    return this.registeredPlugins.get(resolvedName) || null;
  }

  /**
   * Auto-discover and register plugins from common locations
   */
  async discoverPlugins(): Promise<void> {
    this.logger.info('Starting plugin discovery...');
    
    try {
      // Discover from npm registry (simplified implementation)
      await this.discoverFromNpmRegistry();
      
      // Discover from local node_modules
      await this.discoverFromNodeModules();
      
      this.logger.info(`Plugin discovery completed. Found ${this.registeredPlugins.size} plugins.`);
    } catch (error) {
      this.logger.warn(`Plugin discovery failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Refresh plugin metadata (re-discover and update)
   */
  async refreshPlugins(): Promise<void> {
    this.logger.info('Refreshing plugin registry...');
    
    // Clear current registry (except built-ins)
    const builtinPlugins = new Map<string, PluginMetadata>();
    for (const [name, metadata] of this.registeredPlugins.entries()) {
      if (name.startsWith('@nx-plugin-openapi/')) {
        builtinPlugins.set(name, metadata);
      }
    }
    
    this.registeredPlugins.clear();
    
    // Restore built-ins
    for (const [name, metadata] of builtinPlugins.entries()) {
      this.registeredPlugins.set(name, metadata);
    }
    
    // Re-discover
    await this.discoverPlugins();
  }

  /**
   * Clear the plugin loader cache
   */
  clearCache(): void {
    this.pluginLoader.clearCache();
    this.logger.debug('Cleared plugin loader cache');
  }

  /**
   * Resolve plugin name through aliases
   */
  private resolvePluginName(nameOrAlias: string): string {
    return this.pluginAliases.get(nameOrAlias) || nameOrAlias;
  }

  /**
   * Validate plugin metadata
   */
  private validatePluginMetadata(metadata: PluginMetadata): void {
    const errors: string[] = [];
    
    if (!metadata.name || typeof metadata.name !== 'string') {
      errors.push('Plugin metadata must have a name (string)');
    }
    
    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push('Plugin metadata must have a version (string)');
    }
    
    if (!metadata.packageName || typeof metadata.packageName !== 'string') {
      errors.push('Plugin metadata must have a packageName (string)');
    }
    
    if (!Array.isArray(metadata.supportedFileTypes)) {
      errors.push('Plugin metadata must have supportedFileTypes (array)');
    }
    
    if (!Array.isArray(metadata.requiredOptions)) {
      errors.push('Plugin metadata must have requiredOptions (array)');
    }
    
    if (typeof metadata.isInstalled !== 'boolean') {
      errors.push('Plugin metadata must have isInstalled (boolean)');
    }
    
    if (errors.length > 0) {
      throw new RegistryError(`Invalid plugin metadata for '${metadata.name || 'unknown'}': ${errors.join(', ')}`);
    }
  }

  /**
   * Initialize built-in plugins
   */
  private initializeBuiltinPlugins(): void {
    // Register built-in plugins that come with nx-plugin-openapi
    // This would be expanded based on the actual built-in plugins available
    this.logger.debug('Initializing built-in plugins...');
  }

  /**
   * Discover plugins from npm registry
   */
  private async discoverFromNpmRegistry(): Promise<void> {
    // This is a simplified implementation
    // In practice, you'd query the npm registry for packages matching patterns like:
    // - "nx-plugin-openapi-*"
    // - packages with keywords: ["nx-plugin", "openapi", "generator"]
    this.logger.debug('Discovering plugins from npm registry...');
  }

  /**
   * Discover plugins from local node_modules
   */
  private async discoverFromNodeModules(): Promise<void> {
    // This would scan node_modules for packages that match plugin patterns
    // and attempt to load their metadata
    this.logger.debug('Discovering plugins from local node_modules...');
  }
}