import { GeneratorRegistry } from './registry';
import { GeneratorPlugin } from './interfaces';
import { PluginNotFoundError } from './errors';

describe('GeneratorRegistry', () => {
  let registry: GeneratorRegistry;

  beforeEach(() => {
    // Reset the singleton instance
    (GeneratorRegistry as unknown as { _instance: GeneratorRegistry | null })._instance = null;
    registry = GeneratorRegistry.instance();
  });

  afterEach(() => {
    // Clear registry between tests
    (registry as unknown as { plugins: Map<string, unknown> }).plugins.clear();
  });

  describe('instance', () => {
    it('should return singleton instance', () => {
      const instance1 = GeneratorRegistry.instance();
      const instance2 = GeneratorRegistry.instance();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance if not exists', () => {
      (GeneratorRegistry as unknown as { _instance: GeneratorRegistry | null })._instance = null;
      const instance = GeneratorRegistry.instance();

      expect(instance).toBeInstanceOf(GeneratorRegistry);
      expect((GeneratorRegistry as unknown as { _instance: GeneratorRegistry | null })._instance).toBe(instance);
    });
  });

  describe('register', () => {
    it('should register a plugin', () => {
      const mockPlugin: GeneratorPlugin = {
        name: 'test-plugin',
        generate: jest.fn(),
        validate: jest.fn(),
        getSchema: jest.fn(),
      };

      registry.register(mockPlugin);

      expect(registry.has('test-plugin')).toBe(true);
    });

    it('should overwrite existing plugin with same name', () => {
      const mockPlugin1: GeneratorPlugin = {
        name: 'test-plugin',
        generate: jest.fn(),
        validate: jest.fn(),
        getSchema: jest.fn(),
      };

      const mockPlugin2: GeneratorPlugin = {
        name: 'test-plugin',
        generate: jest.fn(),
        validate: jest.fn(),
        getSchema: jest.fn(),
      };

      registry.register(mockPlugin1);
      registry.register(mockPlugin2);

      expect(registry.get('test-plugin')).toBe(mockPlugin2);
    });
  });

  describe('has', () => {
    it('should return true if plugin exists', () => {
      const mockPlugin: GeneratorPlugin = {
        name: 'test-plugin',
        generate: jest.fn(),
        validate: jest.fn(),
        getSchema: jest.fn(),
      };

      registry.register(mockPlugin);

      expect(registry.has('test-plugin')).toBe(true);
    });

    it('should return false if plugin does not exist', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('get', () => {
    it('should return registered plugin', () => {
      const mockPlugin: GeneratorPlugin = {
        name: 'test-plugin',
        generate: jest.fn(),
        validate: jest.fn(),
        getSchema: jest.fn(),
      };

      registry.register(mockPlugin);

      const result = registry.get('test-plugin');
      expect(result).toBe(mockPlugin);
    });

    it('should throw PluginNotFoundError if plugin does not exist', () => {
      expect(() => registry.get('non-existent')).toThrow(PluginNotFoundError);
      expect(() => registry.get('non-existent')).toThrow(
        'Generator plugin not found: non-existent'
      );
    });
  });

  describe('list', () => {
    it('should return empty array when no plugins registered', () => {
      const result = registry.list();

      expect(result).toEqual([]);
    });

    it('should return array of plugin names', () => {
      const mockPlugin1: GeneratorPlugin = {
        name: 'plugin-1',
        generate: jest.fn(),
        validate: jest.fn(),
        getSchema: jest.fn(),
      };

      const mockPlugin2: GeneratorPlugin = {
        name: 'plugin-2',
        generate: jest.fn(),
        validate: jest.fn(),
        getSchema: jest.fn(),
      };

      registry.register(mockPlugin1);
      registry.register(mockPlugin2);

      const result = registry.list();
      expect(result).toContain('plugin-1');
      expect(result).toContain('plugin-2');
      expect(result).toHaveLength(2);
    });

    it('should return unique plugin names', () => {
      const mockPlugin: GeneratorPlugin = {
        name: 'test-plugin',
        generate: jest.fn(),
        validate: jest.fn(),
        getSchema: jest.fn(),
      };

      registry.register(mockPlugin);
      registry.register(mockPlugin); // Register same plugin twice

      const result = registry.list();
      expect(result).toEqual(['test-plugin']);
    });
  });
});
