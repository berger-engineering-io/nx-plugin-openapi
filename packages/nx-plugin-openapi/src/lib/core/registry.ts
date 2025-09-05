import { logger } from '@nx/devkit';
import { GeneratorPlugin, PluginMetadata, RegistryConfig } from './interfaces';
import { GeneratorNotFoundError } from './errors';

/**
 * Registry for managing generator plugins
 * Singleton pattern to ensure single registry instance
 */
export class GeneratorRegistry {
  private static instance: GeneratorRegistry;
  private generators: Map<string, GeneratorPlugin> = new Map();
  private defaultGeneratorName: string = 'openapi-tools';
  private config: RegistryConfig = {};

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): GeneratorRegistry {
    if (!GeneratorRegistry.instance) {
      GeneratorRegistry.instance = new GeneratorRegistry();
    }
    return GeneratorRegistry.instance;
  }

  /**
   * Register a generator plugin
   */
  register(generator: GeneratorPlugin): void {
    if (this.generators.has(generator.name)) {
      logger.warn(
        `Generator '${generator.name}' is already registered. Overwriting...`
      );
    }
    
    this.generators.set(generator.name, generator);
    logger.verbose(`Registered generator: ${generator.name}`);
  }

  /**
   * Unregister a generator plugin
   */
  unregister(name: string): boolean {
    return this.generators.delete(name);
  }

  /**
   * Get a generator by name
   */
  get(name: string): GeneratorPlugin | undefined {
    return this.generators.get(name);
  }

  /**
   * Get a generator or throw if not found
   */
  getOrThrow(name: string): GeneratorPlugin {
    const generator = this.get(name);
    if (!generator) {
      throw new GeneratorNotFoundError(name);
    }
    return generator;
  }

  /**
   * Check if a generator is registered
   */
  has(name: string): boolean {
    return this.generators.has(name);
  }

  /**
   * List all registered generators
   */
  list(): GeneratorPlugin[] {
    return Array.from(this.generators.values());
  }

  /**
   * List generator names
   */
  listNames(): string[] {
    return Array.from(this.generators.keys());
  }

  /**
   * Get the default generator
   */
  getDefault(): GeneratorPlugin | undefined {
    return this.generators.get(this.defaultGeneratorName);
  }

  /**
   * Get the default generator or throw if not found
   */
  getDefaultOrThrow(): GeneratorPlugin {
    const generator = this.getDefault();
    if (!generator) {
      throw new GeneratorNotFoundError(this.defaultGeneratorName);
    }
    return generator;
  }

  /**
   * Set the default generator name
   */
  setDefault(name: string): void {
    if (!this.generators.has(name)) {
      throw new GeneratorNotFoundError(name);
    }
    this.defaultGeneratorName = name;
  }

  /**
   * Get the default generator name
   */
  getDefaultName(): string {
    return this.defaultGeneratorName;
  }

  /**
   * Clear all registered generators
   */
  clear(): void {
    this.generators.clear();
  }

  /**
   * Get the count of registered generators
   */
  count(): number {
    return this.generators.size;
  }

  /**
   * Configure the registry
   */
  configure(config: RegistryConfig): void {
    this.config = config;
    if (config.defaultGenerator) {
      this.defaultGeneratorName = config.defaultGenerator;
    }
  }

  /**
   * Get registry configuration
   */
  getConfig(): RegistryConfig {
    return this.config;
  }

  /**
   * Auto-discover generators from node_modules
   * Searches for packages with 'nx-openapi-generator' keyword
   */
  async discover(): Promise<void> {
    logger.info('Discovering generator plugins...');
    
    try {
      // Look for known plugin packages
      const knownPlugins = [
        '@lambda-solutions/nx-openapi-plugin-openapi-tools',
        '@lambda-solutions/nx-openapi-plugin-orval',
        '@lambda-solutions/nx-openapi-plugin-openapi-typescript',
      ];

      for (const packageName of knownPlugins) {
        try {
          await this.loadPlugin(packageName);
        } catch (error) {
          // Plugin not installed, skip silently
          logger.verbose(`Plugin ${packageName} not found, skipping...`);
        }
      }

      // Also check configured plugins
      if (this.config.plugins) {
        for (const [name, metadata] of Object.entries(this.config.plugins)) {
          try {
            await this.loadPlugin(metadata.packageName, name);
          } catch (error) {
            logger.warn(`Failed to load configured plugin '${name}': ${error}`);
          }
        }
      }
    } catch (error) {
      logger.warn(`Plugin discovery failed: ${error}`);
    }
  }

  /**
   * Load a plugin from a package
   */
  private async loadPlugin(packageName: string, name?: string): Promise<void> {
    try {
      const pluginModule = require(packageName);
      
      // Look for default export or specific exports
      let GeneratorClass: any;
      
      if (pluginModule.default) {
        GeneratorClass = pluginModule.default;
      } else if (pluginModule.Generator) {
        GeneratorClass = pluginModule.Generator;
      } else {
        // Try to find a class that ends with 'Generator'
        const generatorKey = Object.keys(pluginModule).find(
          (key) => key.endsWith('Generator')
        );
        if (generatorKey) {
          GeneratorClass = pluginModule[generatorKey];
        }
      }

      if (GeneratorClass) {
        const generator = new GeneratorClass();
        this.register(generator);
        logger.info(`Loaded plugin: ${generator.name} from ${packageName}`);
      } else {
        logger.warn(`No generator found in package: ${packageName}`);
      }
    } catch (error) {
      throw new Error(`Failed to load plugin from ${packageName}: ${error}`);
    }
  }

  /**
   * Get plugin metadata by name
   */
  getPluginMetadata(name: string): PluginMetadata | undefined {
    return this.config.plugins?.[name];
  }

  /**
   * Find a generator that supports a specific type
   */
  findByType(generatorType: string): GeneratorPlugin | undefined {
    for (const generator of this.generators.values()) {
      if (generator.getSupportedTypes().includes(generatorType)) {
        return generator;
      }
    }
    return undefined;
  }

  /**
   * Get all generators that support a specific type
   */
  findAllByType(generatorType: string): GeneratorPlugin[] {
    const results: GeneratorPlugin[] = [];
    for (const generator of this.generators.values()) {
      if (generator.getSupportedTypes().includes(generatorType)) {
        results.push(generator);
      }
    }
    return results;
  }

  /**
   * Get registry summary for logging
   */
  getSummary(): string {
    const generators = this.list();
    const lines = ['Generator Registry Summary:'];
    lines.push(`  Total generators: ${generators.length}`);
    lines.push(`  Default generator: ${this.defaultGeneratorName}`);
    
    if (generators.length > 0) {
      lines.push('  Registered generators:');
      for (const gen of generators) {
        const available = gen.isAvailable() ? '✓' : '✗';
        lines.push(`    - ${gen.name} (${gen.displayName}) [${available}]`);
      }
    }
    
    return lines.join('\n');
  }
}