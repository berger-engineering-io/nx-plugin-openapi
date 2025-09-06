import { logger } from '@nx/devkit';
import { 
  GeneratorPlugin, 
  GeneratorRegistryConfig, 
  PluginDiscoveryResult 
} from './interfaces';
import { 
  GeneratorNotFoundError, 
  PluginRegistrationError,
  ConfigurationError 
} from './errors';
import { PluginLoader, PluginLoaderOptions } from './plugin-loader';

/**
 * Extended registry configuration with auto-installation options
 */
export interface ExtendedGeneratorRegistryConfig extends GeneratorRegistryConfig {
  /**
   * Plugin loader configuration options
   */
  pluginLoaderOptions?: PluginLoaderOptions;
}

/**
 * Singleton registry for managing generator plugins
 */
export class GeneratorRegistry {
  private static instance: GeneratorRegistry | undefined;
  private readonly plugins = new Map<string, GeneratorPlugin>();
  private defaultGenerator: string | undefined;
  private pluginLoader: PluginLoader;
  private config: ExtendedGeneratorRegistryConfig = {};

  private constructor(options: PluginLoaderOptions = {}) {
    this.pluginLoader = new PluginLoader(options);
    this.initializeBundledGenerators();
  }

  /**
   * Get the singleton instance of the registry
   */
  public static getInstance(options: PluginLoaderOptions = {}): GeneratorRegistry {
    if (!GeneratorRegistry.instance) {
      GeneratorRegistry.instance = new GeneratorRegistry(options);
    }
    return GeneratorRegistry.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    GeneratorRegistry.instance = undefined;
  }

  /**
   * Register a generator plugin
   */
  public register(plugin: GeneratorPlugin, options: { force?: boolean } = {}): void {
    if (this.plugins.has(plugin.name) && !options.force) {
      throw new PluginRegistrationError(
        plugin.name,
        'Generator already registered',
        this.plugins.get(plugin.name)?.packageName
      );
    }

    this.plugins.set(plugin.name, plugin);
    logger.verbose(`Registered generator: ${plugin.name} (${plugin.displayName})`);
  }

  /**
   * Get a generator plugin by name
   */
  public get(name: string): GeneratorPlugin {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new GeneratorNotFoundError(name, this.getAvailableGeneratorNames());
    }
    return plugin;
  }

  /**
   * Get all registered generator plugins
   */
  public getAll(): GeneratorPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all available generator names
   */
  public getAvailableGeneratorNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Check if a generator is registered
   */
  public has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Set the default generator
   */
  public setDefault(name: string): void {
    if (!this.plugins.has(name)) {
      throw new GeneratorNotFoundError(name, this.getAvailableGeneratorNames());
    }
    this.defaultGenerator = name;
    logger.verbose(`Set default generator to: ${name}`);
  }

  /**
   * Get the default generator
   */
  public getDefault(): GeneratorPlugin {
    if (!this.defaultGenerator) {
      // Try to use the first available generator as default
      const availableNames = this.getAvailableGeneratorNames();
      if (availableNames.length === 0) {
        throw new GeneratorNotFoundError('default', []);
      }
      this.defaultGenerator = availableNames[0];
      logger.verbose(`Using first available generator as default: ${this.defaultGenerator}`);
    }
    return this.get(this.defaultGenerator);
  }

  /**
   * Get the name of the default generator
   */
  public getDefaultName(): string | undefined {
    return this.defaultGenerator;
  }

  /**
   * Unregister a generator plugin
   */
  public unregister(name: string): boolean {
    const existed = this.plugins.delete(name);
    if (existed) {
      logger.verbose(`Unregistered generator: ${name}`);
      // Clear default if it was the unregistered generator
      if (this.defaultGenerator === name) {
        this.defaultGenerator = undefined;
      }
    }
    return existed;
  }

  /**
   * Clear all registered generators
   */
  public clear(): void {
    this.plugins.clear();
    this.defaultGenerator = undefined;
    logger.verbose('Cleared all registered generators');
  }

  /**
   * Get generators by supported type
   */
  public getGeneratorsByType(type: string): GeneratorPlugin[] {
    return this.getAll().filter(plugin => plugin.getSupportedTypes().includes(type));
  }

  /**
   * Load and register a generator plugin from a package
   */
  public async loadAndRegister(packageName: string, options: { force?: boolean } = {}): Promise<PluginDiscoveryResult> {
    const discoveryResult = await this.pluginLoader.loadPlugin(packageName);
    this.register(discoveryResult.plugin, options);
    return discoveryResult;
  }

  /**
   * Attempt to load and register a generator with optional auto-installation
   */
  public async loadAndRegisterWithAutoInstall(
    packageName: string, 
    options: { 
      force?: boolean; 
      autoInstall?: boolean; 
      skipPrompts?: boolean;
    } = {}
  ): Promise<PluginDiscoveryResult | null> {
    try {
      // First try to load normally
      return await this.loadAndRegister(packageName, options);
    } catch (error) {
      // If loading fails and we have auto-install options, update plugin loader
      if (options.autoInstall !== undefined || options.skipPrompts !== undefined) {
        const newPluginLoader = new PluginLoader({
          autoInstall: options.autoInstall,
          skipPrompts: options.skipPrompts,
        });

        try {
          const discoveryResult = await newPluginLoader.loadPlugin(packageName);
          this.register(discoveryResult.plugin, options);
          return discoveryResult;
        } catch (installError) {
          logger.warn(`Failed to auto-install and load plugin ${packageName}: ${installError}`);
          return null;
        }
      }
      
      throw error;
    }
  }

  /**
   * Discover and load generators from node_modules
   */
  public async discoverGenerators(searchPaths?: string[]): Promise<PluginDiscoveryResult[]> {
    const paths = searchPaths || this.config.searchPaths || ['node_modules'];
    const results: PluginDiscoveryResult[] = [];

    for (const path of paths) {
      try {
        const discovered = await this.pluginLoader.discoverPlugins(path);
        results.push(...discovered);

        // Register discovered plugins
        for (const result of discovered) {
          try {
            this.register(result.plugin, { force: false });
          } catch (error) {
            logger.warn(`Failed to register discovered plugin ${result.plugin.name}: ${error}`);
          }
        }
      } catch (error) {
        logger.warn(`Failed to discover plugins in ${path}: ${error}`);
      }
    }

    return results;
  }

  /**
   * Set registry configuration
   */
  public setConfig(config: ExtendedGeneratorRegistryConfig): void {
    this.config = { ...config };

    // Update plugin loader if options changed
    if (config.pluginLoaderOptions) {
      this.pluginLoader = new PluginLoader(config.pluginLoaderOptions);
    }

    if (config.defaultGenerator) {
      try {
        this.setDefault(config.defaultGenerator);
      } catch (error) {
        logger.warn(`Failed to set default generator from config: ${error}`);
      }
    }
  }

  /**
   * Get current registry configuration
   */
  public getConfig(): ExtendedGeneratorRegistryConfig {
    return { ...this.config };
  }

  /**
   * Get registry statistics
   */
  public getStats(): {
    totalGenerators: number;
    generatorsByType: Record<string, string[]>;
    defaultGenerator: string | undefined;
    bundledGenerators: string[];
    externalGenerators: string[];
  } {
    const generators = this.getAll();
    const generatorsByType: Record<string, string[]> = {};
    const bundledGenerators: string[] = [];
    const externalGenerators: string[] = [];

    for (const generator of generators) {
      // Categorize as bundled or external
      // Bundled generators are those that come with this package
      if (generator.packageName.startsWith('@openapitools/') || generator.packageName.startsWith('@nx-plugin-openapi/')) {
        bundledGenerators.push(generator.name);
      } else {
        externalGenerators.push(generator.name);
      }

      // Group by supported types
      for (const type of generator.getSupportedTypes()) {
        if (!generatorsByType[type]) {
          generatorsByType[type] = [];
        }
        generatorsByType[type].push(generator.name);
      }
    }

    return {
      totalGenerators: generators.length,
      generatorsByType,
      defaultGenerator: this.defaultGenerator,
      bundledGenerators,
      externalGenerators,
    };
  }

  /**
   * Validate registry configuration
   */
  public validateConfig(config: ExtendedGeneratorRegistryConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.defaultGenerator && typeof config.defaultGenerator !== 'string') {
      errors.push('defaultGenerator must be a string');
    }

    if (config.searchPaths) {
      if (!Array.isArray(config.searchPaths)) {
        errors.push('searchPaths must be an array');
      } else {
        for (const path of config.searchPaths) {
          if (typeof path !== 'string') {
            errors.push('All searchPaths must be strings');
            break;
          }
        }
      }
    }

    if (config.generators) {
      if (typeof config.generators !== 'object') {
        errors.push('generators must be an object');
      } else {
        for (const [name, path] of Object.entries(config.generators)) {
          if (typeof name !== 'string' || typeof path !== 'string') {
            errors.push('All generator mappings must have string keys and values');
            break;
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Initialize built-in/bundled generators
   */
  private initializeBundledGenerators(): void {
    logger.verbose('Initializing bundled generators...');
    
    try {
      // Import and register the bundled OpenAPI Tools generator
      // Use dynamic import to avoid circular dependency issues
      const { OpenAPIToolsGenerator } = require('../bundled/openapi-tools'); // eslint-disable-line @typescript-eslint/no-require-imports
      const openApiToolsGenerator = new OpenAPIToolsGenerator();
      this.register(openApiToolsGenerator);
      this.setDefault(openApiToolsGenerator.name);
      
      logger.verbose('Bundled generators initialized successfully');
    } catch (error) {
      logger.warn(`Failed to initialize bundled generators: ${error}`);
    }
  }

  /**
   * Get a formatted list of all registered generators
   */
  public toString(): string {
    const generators = this.getAll();
    if (generators.length === 0) {
      return 'No generators registered';
    }

    const lines = ['Registered Generators:'];
    for (const generator of generators) {
      const isDefault = generator.name === this.defaultGenerator ? ' (default)' : '';
      const supportedTypes = generator.getSupportedTypes().join(', ');
      lines.push(`  - ${generator.name}${isDefault}: ${generator.displayName} [${supportedTypes}]`);
    }

    return lines.join('\n');
  }
}