import { logger } from '@nx/devkit';
import * as path from 'path';
import * as fs from 'fs';
import { GeneratorPlugin } from './interfaces';
import { PluginLoadError } from './errors';
import { GeneratorRegistry } from './registry';

/**
 * Plugin loader for dynamically loading generator plugins
 */
export class PluginLoader {
  private registry: GeneratorRegistry;

  constructor(registry?: GeneratorRegistry) {
    this.registry = registry || GeneratorRegistry.getInstance();
  }

  /**
   * Load a plugin by name or package
   */
  async loadPlugin(nameOrPackage: string): Promise<GeneratorPlugin> {
    logger.verbose(`Attempting to load plugin: ${nameOrPackage}`);

    // First, check if it's already registered
    const existing = this.registry.get(nameOrPackage);
    if (existing) {
      logger.verbose(`Plugin '${nameOrPackage}' already registered`);
      return existing;
    }

    // Try to load as a package
    const packageName = this.resolvePackageName(nameOrPackage);
    
    try {
      const plugin = await this.loadFromPackage(packageName);
      this.registry.register(plugin);
      return plugin;
    } catch (error) {
      throw new PluginLoadError(nameOrPackage, packageName, error as Error);
    }
  }

  /**
   * Load plugin from a package
   */
  private async loadFromPackage(packageName: string): Promise<GeneratorPlugin> {
    try {
      // Try to resolve the package
      const packagePath = require.resolve(packageName, {
        paths: [process.cwd(), __dirname],
      });

      // Load the module
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pluginModule = require(packagePath);

      // Extract the generator class
      const GeneratorClass = this.extractGeneratorClass(pluginModule);

      if (!GeneratorClass) {
        throw new Error(
          `No valid generator class found in package '${packageName}'`
        );
      }

      // Instantiate the generator
      const generator = new (GeneratorClass as any)();

      // Validate it implements the interface
      if (!this.isValidGenerator(generator)) {
        throw new Error(
          `Plugin from package '${packageName}' does not implement GeneratorPlugin interface`
        );
      }

      logger.info(`Successfully loaded plugin from package: ${packageName}`);
      return generator;
    } catch (error) {
      throw new Error(`Failed to load plugin from package '${packageName}': ${error}`);
    }
  }

  /**
   * Extract generator class from module
   */
  private extractGeneratorClass(module: unknown): unknown {
    const mod = module as any;
    
    // Check for default export
    if (mod.default && typeof mod.default === 'function') {
      return mod.default;
    }

    // Check for named export 'Generator'
    if (mod.Generator && typeof mod.Generator === 'function') {
      return mod.Generator;
    }

    // Look for any export ending with 'Generator'
    for (const key of Object.keys(mod)) {
      if (
        key.endsWith('Generator') &&
        typeof (mod as any)[key] === 'function'
      ) {
        return (mod as any)[key];
      }
    }

    return null;
  }

  /**
   * Validate that an object implements GeneratorPlugin
   */
  private isValidGenerator(obj: unknown): obj is GeneratorPlugin {
    const gen = obj as any;
    return (
      gen &&
      typeof gen.name === 'string' &&
      typeof gen.displayName === 'string' &&
      typeof gen.description === 'string' &&
      typeof gen.isAvailable === 'function' &&
      typeof gen.getSchema === 'function' &&
      typeof gen.validateOptions === 'function' &&
      typeof gen.generate === 'function' &&
      typeof gen.getSupportedTypes === 'function'
    );
  }

  /**
   * Resolve package name from a generator name
   */
  private resolvePackageName(name: string): string {
    // If it's already a scoped package, return as is
    if (name.startsWith('@')) {
      return name;
    }

    // Check if it's a known short name
    const knownMappings: Record<string, string> = {
      'openapi-tools': '@lambda-solutions/nx-openapi-plugin-openapi-tools',
      'orval': '@lambda-solutions/nx-openapi-plugin-orval',
      'openapi-typescript': '@lambda-solutions/nx-openapi-plugin-openapi-typescript',
    };

    if (knownMappings[name]) {
      return knownMappings[name];
    }

    // Check registry config for custom mappings
    const metadata = this.registry.getPluginMetadata(name);
    if (metadata?.packageName) {
      return metadata.packageName;
    }

    // Assume it's a package name
    return name;
  }

  /**
   * Load all plugins from a directory
   */
  async loadFromDirectory(directory: string): Promise<GeneratorPlugin[]> {
    const plugins: GeneratorPlugin[] = [];

    if (!fs.existsSync(directory)) {
      logger.warn(`Plugin directory does not exist: ${directory}`);
      return plugins;
    }

    const files = fs.readdirSync(directory);
    
    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        const filePath = path.join(directory, file);
        
        try {
          const plugin = await this.loadFromFile(filePath);
          plugins.push(plugin);
          this.registry.register(plugin);
        } catch (error) {
          logger.warn(`Failed to load plugin from file ${filePath}: ${error}`);
        }
      }
    }

    return plugins;
  }

  /**
   * Load a plugin from a file
   */
  private async loadFromFile(filePath: string): Promise<GeneratorPlugin> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pluginModule = require(filePath);
      const GeneratorClass = this.extractGeneratorClass(pluginModule);

      if (!GeneratorClass) {
        throw new Error(`No valid generator class found in file`);
      }

      const generator = new (GeneratorClass as any)();

      if (!this.isValidGenerator(generator)) {
        throw new Error(`File does not export a valid GeneratorPlugin`);
      }

      logger.info(`Loaded plugin from file: ${filePath}`);
      return generator;
    } catch (error) {
      throw new Error(`Failed to load plugin from file '${filePath}': ${error}`);
    }
  }

  /**
   * Discover and load plugins from node_modules
   */
  async discoverPlugins(): Promise<void> {
    logger.info('Discovering generator plugins from node_modules...');

    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      logger.warn('node_modules directory not found');
      return;
    }

    // Look for @lambda-solutions scope
    const scopePath = path.join(nodeModulesPath, '@lambda-solutions');
    if (fs.existsSync(scopePath)) {
      const packages = fs.readdirSync(scopePath);
      
      for (const pkg of packages) {
        if (pkg.startsWith('nx-openapi-plugin-')) {
          try {
            await this.loadPlugin(`@lambda-solutions/${pkg}`);
          } catch (error) {
            logger.verbose(`Failed to load plugin @lambda-solutions/${pkg}: ${error}`);
          }
        }
      }
    }

    // Look for packages with nx-openapi-generator keyword
    await this.discoverByKeyword('nx-openapi-generator');
  }

  /**
   * Discover plugins by npm keyword
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async discoverByKeyword(_keyword: string): Promise<void> {
    try {
      // This is a simplified version - in production, you might want to
      // use npm's API or parse package.json files more thoroughly
      // const packages = this.findPackagesWithKeyword(nodeModulesPath, keyword);
      
      // for (const packageName of packages) {
      //   try {
      //     await this.loadPlugin(packageName);
      //   } catch (error) {
      //     logger.verbose(`Failed to load plugin ${packageName}: ${error}`);
      //   }
      // }
    } catch (error) {
      logger.verbose(`Keyword discovery failed: ${error}`);
    }
  }

  /**
   * Find packages with a specific keyword
   */
  private findPackagesWithKeyword(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _nodeModulesPath: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _keyword: string
  ): string[] {
    const packages: string[] = [];

    // This is a simplified implementation
    // In production, you'd want to recursively search and parse package.json files
    
    return packages;
  }

  /**
   * Check if a plugin is available
   */
  async isPluginAvailable(nameOrPackage: string): Promise<boolean> {
    try {
      const packageName = this.resolvePackageName(nameOrPackage);
      require.resolve(packageName, {
        paths: [process.cwd(), __dirname],
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get plugin package.json
   */
  async getPluginPackageInfo(nameOrPackage: string): Promise<unknown> {
    try {
      const packageName = this.resolvePackageName(nameOrPackage);
      const packageJsonPath = require.resolve(`${packageName}/package.json`, {
        paths: [process.cwd(), __dirname],
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(packageJsonPath);
    } catch (error) {
      throw new Error(
        `Failed to get package info for '${nameOrPackage}': ${error}`
      );
    }
  }
}