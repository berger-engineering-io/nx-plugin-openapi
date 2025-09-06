import { logger } from '@nx/devkit';
import { GeneratorRegistry } from './registry';
import { GeneratorPlugin, PluginDiscoveryResult } from './interfaces';
import { 
  GeneratorNotFoundError, 
  PluginRegistrationError,
} from './errors';
import { PluginLoader } from './plugin-loader';

// Mock the logger
jest.mock('@nx/devkit', () => ({
  logger: {
    info: jest.fn(),
    verbose: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the plugin loader
jest.mock('./plugin-loader');
const MockPluginLoader = PluginLoader as jest.MockedClass<typeof PluginLoader>;

// Mock the bundled generator
jest.mock('../bundled/openapi-tools', () => ({
  OpenAPIToolsGenerator: jest.fn().mockImplementation(() => ({
    name: 'openapi-tools',
    displayName: 'OpenAPI Generator CLI',
    packageName: '@openapitools/openapi-generator-cli',
    generate: jest.fn(),
    getSupportedTypes: jest.fn().mockReturnValue(['typescript-angular']),
    getSchema: jest.fn(),
    validate: jest.fn(),
  })),
}));

describe('GeneratorRegistry', () => {
  let registry: GeneratorRegistry;
  let mockPluginLoader: jest.Mocked<PluginLoader>;
  let mockPlugin: jest.Mocked<GeneratorPlugin>;

  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    // Reset singleton
    GeneratorRegistry.resetInstance();
    
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock plugin loader
    mockPluginLoader = {
      loadPlugin: jest.fn(),
      discoverPlugins: jest.fn(),
      validatePlugin: jest.fn(),
      clearCache: jest.fn(),
      getStats: jest.fn(),
    } as any;

    MockPluginLoader.mockImplementation(() => mockPluginLoader);

    // Create mock plugin
    mockPlugin = {
      name: 'test-generator',
      displayName: 'Test Generator',
      packageName: 'test-package',
      generate: jest.fn(),
      getSupportedTypes: jest.fn().mockReturnValue(['typescript']),
      getSchema: jest.fn(),
      validate: jest.fn(),
    };

    registry = GeneratorRegistry.getInstance();
  });

  afterEach(() => {
    GeneratorRegistry.resetInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = GeneratorRegistry.getInstance();
      const instance2 = GeneratorRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = GeneratorRegistry.getInstance();
      GeneratorRegistry.resetInstance();
      const instance2 = GeneratorRegistry.getInstance();
      expect(instance1).not.toBe(instance2);
    });

    it('should pass options to plugin loader', () => {
      GeneratorRegistry.resetInstance();
      const options = { autoInstall: true, skipPrompts: false };
      GeneratorRegistry.getInstance(options);
      
      expect(MockPluginLoader).toHaveBeenCalledWith(options);
    });
  });

  describe('plugin registration', () => {
    it('should register a plugin successfully', () => {
      registry.register(mockPlugin);

      expect(registry.has('test-generator')).toBe(true);
      expect(registry.get('test-generator')).toBe(mockPlugin);
      expect(mockLogger.verbose).toHaveBeenCalledWith(
        'Registered generator: test-generator (Test Generator)'
      );
    });

    it('should throw error when registering duplicate plugin without force', () => {
      registry.register(mockPlugin);

      expect(() => registry.register(mockPlugin)).toThrow(PluginRegistrationError);
      expect(() => registry.register(mockPlugin)).toThrow(/already registered/);
    });

    it('should allow overriding plugin with force option', () => {
      registry.register(mockPlugin);
      
      const newMockPlugin = {
        ...mockPlugin,
        displayName: 'Updated Test Generator'
      };

      registry.register(newMockPlugin, { force: true });

      expect(registry.get('test-generator')).toBe(newMockPlugin);
    });

    it('should include package name in error details for duplicate registration', () => {
      registry.register(mockPlugin);

      try {
        registry.register(mockPlugin);
      } catch (error) {
        expect(error).toBeInstanceOf(PluginRegistrationError);
        expect((error as PluginRegistrationError).details?.existingPlugin).toBe('test-package');
      }
    });
  });

  describe('plugin retrieval', () => {
    beforeEach(() => {
      registry.register(mockPlugin);
    });

    it('should get registered plugin by name', () => {
      const plugin = registry.get('test-generator');
      expect(plugin).toBe(mockPlugin);
    });

    it('should throw error when getting non-existent plugin', () => {
      expect(() => registry.get('non-existent')).toThrow(GeneratorNotFoundError);
      expect(() => registry.get('non-existent')).toThrow(/not found/);
    });

    it('should include available generators in not found error', () => {
      try {
        registry.get('non-existent');
      } catch (error) {
        expect(error).toBeInstanceOf(GeneratorNotFoundError);
        expect((error as GeneratorNotFoundError).details?.availableGenerators).toContain('test-generator');
      }
    });

    it('should check if plugin exists', () => {
      expect(registry.has('test-generator')).toBe(true);
      expect(registry.has('non-existent')).toBe(false);
    });

    it('should get all registered plugins', () => {
      const mockPlugin2 = { ...mockPlugin, name: 'test-generator-2' };
      registry.register(mockPlugin2);

      const allPlugins = registry.getAll();
      expect(allPlugins).toHaveLength(3); // Including bundled openapi-tools
      expect(allPlugins).toContainEqual(mockPlugin);
      expect(allPlugins).toContainEqual(mockPlugin2);
    });

    it('should get available generator names', () => {
      const names = registry.getAvailableGeneratorNames();
      expect(names).toContain('test-generator');
      expect(names).toContain('openapi-tools'); // bundled
    });
  });

  describe('default generator management', () => {
    beforeEach(() => {
      registry.register(mockPlugin);
    });

    it('should set default generator', () => {
      registry.setDefault('test-generator');
      expect(registry.getDefaultName()).toBe('test-generator');
      expect(mockLogger.verbose).toHaveBeenCalledWith(
        'Set default generator to: test-generator'
      );
    });

    it('should throw error when setting non-existent generator as default', () => {
      expect(() => registry.setDefault('non-existent')).toThrow(GeneratorNotFoundError);
    });

    it('should get default generator', () => {
      registry.setDefault('test-generator');
      const defaultGen = registry.getDefault();
      expect(defaultGen).toBe(mockPlugin);
    });

    it('should use first available generator as default when none set', () => {
      // Clear registry and add a test generator
      registry.clear();
      registry.register(mockPlugin);
      
      const defaultGen = registry.getDefault();
      expect(defaultGen).toBeDefined();
      expect(mockLogger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('Using first available generator as default:')
      );
    });

    it('should throw error when no generators available for default', () => {
      registry.clear();
      expect(() => registry.getDefault()).toThrow(GeneratorNotFoundError);
    });

    it('should clear default when unregistering default generator', () => {
      registry.setDefault('test-generator');
      registry.unregister('test-generator');
      expect(registry.getDefaultName()).toBeUndefined();
    });
  });

  describe('plugin management', () => {
    beforeEach(() => {
      registry.register(mockPlugin);
    });

    it('should unregister a plugin', () => {
      const result = registry.unregister('test-generator');
      
      expect(result).toBe(true);
      expect(registry.has('test-generator')).toBe(false);
      expect(mockLogger.verbose).toHaveBeenCalledWith('Unregistered generator: test-generator');
    });

    it('should return false when unregistering non-existent plugin', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });

    it('should clear all plugins', () => {
      registry.clear();
      
      expect(registry.getAvailableGeneratorNames()).toHaveLength(0);
      expect(registry.getDefaultName()).toBeUndefined();
      expect(mockLogger.verbose).toHaveBeenCalledWith('Cleared all registered generators');
    });

    it('should get generators by supported type', () => {
      const mockAngularPlugin = {
        ...mockPlugin,
        name: 'angular-generator',
        getSupportedTypes: jest.fn().mockReturnValue(['typescript-angular'])
      };
      registry.register(mockAngularPlugin);

      const typescriptGenerators = registry.getGeneratorsByType('typescript');
      const angularGenerators = registry.getGeneratorsByType('typescript-angular');

      expect(typescriptGenerators).toContainEqual(mockPlugin);
      expect(angularGenerators).toContainEqual(mockAngularPlugin);
    });
  });

  describe('plugin loading', () => {
    it('should load and register plugin', async () => {
      const mockDiscoveryResult: PluginDiscoveryResult = {
        plugin: mockPlugin,
        source: 'npm',
        version: '1.0.0',
        path: '/path/to/plugin'
      };
      mockPluginLoader.loadPlugin.mockResolvedValue(mockDiscoveryResult);

      const result = await registry.loadAndRegister('test-package');

      expect(mockPluginLoader.loadPlugin).toHaveBeenCalledWith('test-package');
      expect(registry.has('test-generator')).toBe(true);
      expect(result).toBe(mockDiscoveryResult);
    });

    it('should load and register plugin with force option', async () => {
      registry.register(mockPlugin);

      const newPlugin = { ...mockPlugin, displayName: 'New Test Generator' };
      const mockDiscoveryResult: PluginDiscoveryResult = {
        plugin: newPlugin,
        source: 'npm',
        version: '1.0.0'
      };
      mockPluginLoader.loadPlugin.mockResolvedValue(mockDiscoveryResult);

      await registry.loadAndRegister('test-package', { force: true });

      expect(registry.get('test-generator')).toBe(newPlugin);
    });

    it('should handle plugin loading errors', async () => {
      const error = new Error('Loading failed');
      mockPluginLoader.loadPlugin.mockRejectedValue(error);

      await expect(registry.loadAndRegister('test-package')).rejects.toThrow('Loading failed');
    });
  });

  describe('auto-installation', () => {
    it('should try normal loading first', async () => {
      const mockDiscoveryResult: PluginDiscoveryResult = {
        plugin: mockPlugin,
        source: 'npm',
        version: '1.0.0'
      };
      mockPluginLoader.loadPlugin.mockResolvedValue(mockDiscoveryResult);

      const result = await registry.loadAndRegisterWithAutoInstall('test-package');

      expect(mockPluginLoader.loadPlugin).toHaveBeenCalledWith('test-package');
      expect(result).toBe(mockDiscoveryResult);
    });

    it('should create new plugin loader with auto-install options on failure', async () => {
      const error = new Error('Plugin not found');
      mockPluginLoader.loadPlugin
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          plugin: mockPlugin,
          source: 'npm',
          version: '1.0.0'
        });

      const result = await registry.loadAndRegisterWithAutoInstall('test-package', {
        autoInstall: true,
        skipPrompts: true
      });

      expect(MockPluginLoader).toHaveBeenCalledWith({
        autoInstall: true,
        skipPrompts: true
      });
      expect(result).toBeDefined();
    });

    it('should return null and log warning on auto-install failure', async () => {
      const error = new Error('Plugin not found');
      mockPluginLoader.loadPlugin.mockRejectedValue(error);

      const result = await registry.loadAndRegisterWithAutoInstall('test-package', {
        autoInstall: true
      });

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to auto-install and load plugin test-package')
      );
    });

    it('should rethrow error when no auto-install options provided', async () => {
      const error = new Error('Plugin not found');
      mockPluginLoader.loadPlugin.mockRejectedValue(error);

      await expect(
        registry.loadAndRegisterWithAutoInstall('test-package')
      ).rejects.toThrow('Plugin not found');
    });
  });

  describe('plugin discovery', () => {
    it('should discover plugins in search paths', async () => {
      const mockDiscoveryResults: PluginDiscoveryResult[] = [
        {
          plugin: mockPlugin,
          source: 'npm',
          version: '1.0.0'
        }
      ];
      mockPluginLoader.discoverPlugins.mockResolvedValue(mockDiscoveryResults);

      const results = await registry.discoverGenerators(['node_modules']);

      expect(mockPluginLoader.discoverPlugins).toHaveBeenCalledWith('node_modules');
      expect(results).toEqual(mockDiscoveryResults);
      expect(registry.has('test-generator')).toBe(true);
    });

    it('should use default search paths when none provided', async () => {
      mockPluginLoader.discoverPlugins.mockResolvedValue([]);

      await registry.discoverGenerators();

      expect(mockPluginLoader.discoverPlugins).toHaveBeenCalledWith('node_modules');
    });

    it('should use configured search paths', async () => {
      registry.setConfig({ searchPaths: ['custom/path'] });
      mockPluginLoader.discoverPlugins.mockResolvedValue([]);

      await registry.discoverGenerators();

      expect(mockPluginLoader.discoverPlugins).toHaveBeenCalledWith('custom/path');
    });

    it('should handle discovery errors gracefully', async () => {
      const error = new Error('Discovery failed');
      mockPluginLoader.discoverPlugins.mockRejectedValue(error);

      const results = await registry.discoverGenerators(['invalid/path']);

      expect(results).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to discover plugins in invalid/path')
      );
    });

    it('should warn when plugin registration fails during discovery', async () => {
      const duplicatePlugin = {
        ...mockPlugin,
        name: 'openapi-tools' // Same as bundled plugin
      };
      const mockDiscoveryResults: PluginDiscoveryResult[] = [
        {
          plugin: duplicatePlugin,
          source: 'npm',
          version: '1.0.0'
        }
      ];
      mockPluginLoader.discoverPlugins.mockResolvedValue(mockDiscoveryResults);

      await registry.discoverGenerators(['node_modules']);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register discovered plugin openapi-tools')
      );
    });
  });

  describe('configuration', () => {
    it('should set and get configuration', () => {
      const config = {
        defaultGenerator: 'test-generator',
        searchPaths: ['custom/path'],
        generators: { 'custom': '/path/to/custom' }
      };

      registry.register(mockPlugin);
      registry.setConfig(config);

      const retrievedConfig = registry.getConfig();
      expect(retrievedConfig).toEqual(config);
      expect(registry.getDefaultName()).toBe('test-generator');
    });

    it('should update plugin loader when options change', () => {
      const newOptions = { autoInstall: true };
      registry.setConfig({ pluginLoaderOptions: newOptions });

      expect(MockPluginLoader).toHaveBeenCalledWith(newOptions);
    });

    it('should warn when setting invalid default generator', () => {
      registry.setConfig({ defaultGenerator: 'non-existent' });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to set default generator from config')
      );
    });

    it('should validate configuration', () => {
      const validConfig = {
        defaultGenerator: 'test-generator',
        searchPaths: ['path1', 'path2'],
        generators: { 'gen1': 'path1' }
      };

      const result = registry.validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid configuration', () => {
      const invalidConfig = {
        defaultGenerator: 123, // Should be string
        searchPaths: 'not-array', // Should be array
        generators: 'not-object' // Should be object
      } as any;

      const result = registry.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('defaultGenerator must be a string');
      expect(result.errors).toContain('searchPaths must be an array');
      expect(result.errors).toContain('generators must be an object');
    });
  });

  describe('statistics', () => {
    beforeEach(() => {
      registry.register(mockPlugin);
    });

    it('should get registry statistics', () => {
      const stats = registry.getStats();

      expect(stats.totalGenerators).toBeGreaterThan(0);
      expect(stats.defaultGenerator).toBeDefined();
      expect(stats.bundledGenerators).toContain('openapi-tools');
      expect(stats.externalGenerators).toContain('test-generator');
    });

    it('should categorize generators by type', () => {
      const mockAngularPlugin = {
        ...mockPlugin,
        name: 'angular-generator',
        getSupportedTypes: jest.fn().mockReturnValue(['typescript-angular'])
      };
      registry.register(mockAngularPlugin);

      const stats = registry.getStats();

      expect(stats.generatorsByType['typescript']).toContain('test-generator');
      expect(stats.generatorsByType['typescript-angular']).toContain('angular-generator');
    });
  });

  describe('bundled generators initialization', () => {
    it('should initialize bundled generators on construction', () => {
      GeneratorRegistry.resetInstance();
      const newRegistry = GeneratorRegistry.getInstance();

      expect(newRegistry.has('openapi-tools')).toBe(true);
      expect(newRegistry.getDefaultName()).toBe('openapi-tools');
    });
  });

  describe('string representation', () => {
    it('should provide formatted string representation', () => {
      registry.register(mockPlugin);
      const str = registry.toString();

      expect(str).toContain('Registered Generators:');
      expect(str).toContain('test-generator: Test Generator');
      expect(str).toContain('[typescript]');
    });

    it('should handle empty registry', () => {
      registry.clear();
      const str = registry.toString();
      expect(str).toBe('No generators registered');
    });

    it('should mark default generator', () => {
      registry.register(mockPlugin);
      registry.setDefault('test-generator');
      const str = registry.toString();

      expect(str).toContain('test-generator (default)');
    });
  });
});