import { ExecutorContext } from '@nx/devkit';
import { GenerateApiExecutorSchema } from './schema';
import { GeneratorPlugin, GeneratorOptions, GeneratorResult } from '../../lib/core/interfaces';

// Mock external dependencies before importing the executor
const mockRmSync = jest.fn();
const mockJoin = jest.fn();

const mockLog = jest.fn((message: string) => `[test] ${message}`);

const mockLogger = {
  info: jest.fn(),
  verbose: jest.fn(),
  error: jest.fn(),
};

// Mock the generator registry and related classes
const mockGeneratorPlugin: jest.Mocked<GeneratorPlugin> = {
  name: 'openapi-tools',
  displayName: 'OpenAPI Generator CLI',
  description: 'Test generator',
  packageName: '@openapitools/openapi-generator-cli',
  minVersion: '2.0.0',
  isAvailable: jest.fn().mockResolvedValue(true),
  getSchema: jest.fn().mockReturnValue({ type: 'object', properties: {} }),
  validateOptions: jest.fn().mockReturnValue({ valid: true }),
  generate: jest.fn().mockResolvedValue({ success: true }),
  getSupportedTypes: jest.fn().mockReturnValue(['typescript-angular']),
  getDependencies: jest.fn().mockReturnValue(['@openapitools/openapi-generator-cli@^2.20.0']),
};

const mockRegistry = {
  getInstance: jest.fn(),
  register: jest.fn(),
  has: jest.fn().mockReturnValue(true),
  get: jest.fn().mockReturnValue(mockGeneratorPlugin),
  getDefaultName: jest.fn().mockReturnValue('openapi-tools'),
  setDefault: jest.fn(),
  listNames: jest.fn().mockReturnValue(['openapi-tools']),
};

const mockPluginLoader = {
  discoverPlugins: jest.fn().mockResolvedValue(undefined),
  loadPlugin: jest.fn().mockResolvedValue(mockGeneratorPlugin),
};

const mockAutoInstaller = {
  ensurePluginInstalled: jest.fn().mockResolvedValue(true),
};

jest.mock('fs', () => ({
  rmSync: mockRmSync,
}));

jest.mock('path', () => ({
  join: mockJoin,
}));

jest.mock('@nx/devkit', () => ({
  logger: mockLogger,
}));

jest.mock('../../generators/utils/log', () => ({
  log: mockLog,
}));

// Mock the core abstraction classes
jest.mock('../../lib/core/registry', () => ({
  GeneratorRegistry: {
    getInstance: jest.fn(() => mockRegistry),
  },
}));

jest.mock('../../lib/core/plugin-loader', () => ({
  PluginLoader: jest.fn().mockImplementation(() => mockPluginLoader),
}));

jest.mock('../../lib/core/auto-installer', () => ({
  PluginAutoInstaller: jest.fn().mockImplementation(() => mockAutoInstaller),
}));

// Mock the bundled generator
jest.mock('../../lib/bundled/openapi-tools/generator', () => ({
  OpenAPIToolsGenerator: jest.fn().mockImplementation(() => mockGeneratorPlugin),
}));

// Import the executor after setting up mocks
import executor from './executor';

describe('GenerateApi Executor', () => {
  const baseContext: ExecutorContext = {
    root: '/test/workspace',
    cwd: '/test/workspace',
    isVerbose: false,
    projectName: 'test-project',
    projectsConfigurations: {
      version: 2,
      projects: {
        'test-project': {
          root: 'apps/test-project',
          targets: {},
        },
      },
    },
    nxJsonConfiguration: {},
    projectGraph: {
      nodes: {},
      dependencies: {},
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJoin.mockImplementation((...paths) => paths.join('/'));
    mockRmSync.mockImplementation(() => undefined);
    
    // Reset mock implementations
    mockGeneratorPlugin.isAvailable.mockResolvedValue(true);
    mockGeneratorPlugin.validateOptions.mockReturnValue({ valid: true });
    mockGeneratorPlugin.generate.mockResolvedValue({ success: true });
    mockRegistry.get.mockReturnValue(mockGeneratorPlugin);
    mockRegistry.has.mockReturnValue(true);
  });

  describe('successful execution', () => {
    it('should execute with required options only', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'openapi.json',
        outputPath: 'libs/api-client',
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockRmSync).toHaveBeenCalledWith(
        '/test/workspace/libs/api-client',
        {
          recursive: true,
          force: true,
        }
      );
      
      // Verify generator plugin interactions
      expect(mockRegistry.get).toHaveBeenCalledWith('openapi-tools');
      expect(mockGeneratorPlugin.isAvailable).toHaveBeenCalled();
      expect(mockGeneratorPlugin.validateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          inputSpec: 'openapi.json',
          outputPath: 'libs/api-client',
          context: baseContext,
        })
      );
      expect(mockGeneratorPlugin.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          inputSpec: 'openapi.json',
          outputPath: 'libs/api-client',
          context: baseContext,
        })
      );
    });

    it('should execute with all options provided', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'swagger.yaml',
        outputPath: 'libs/generated-api',
        generatorType: 'typescript-axios',
        generator: 'openapi-tools',
        configFile: 'openapi-config.json',
        skipValidateSpec: true,
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockGeneratorPlugin.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          inputSpec: 'swagger.yaml',
          outputPath: 'libs/generated-api',
          generatorType: 'typescript-axios',
          context: baseContext,
          rawOptions: expect.objectContaining({
            configFile: 'openapi-config.json',
            skipValidateSpec: true,
          }),
        })
      );
    });

    it('should pass global properties to generator', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
        globalProperties: {
          apiPackage: 'com.example.api',
          modelPackage: 'com.example.models',
        },
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockGeneratorPlugin.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          globalProperties: {
            apiPackage: 'com.example.api',
            modelPackage: 'com.example.models',
          },
        })
      );
    });

    it('should use custom generator when specified', async () => {
      const customGenerator: jest.Mocked<GeneratorPlugin> = {
        ...mockGeneratorPlugin,
        name: 'custom-generator',
        displayName: 'Custom Generator',
      };
      mockRegistry.get.mockReturnValue(customGenerator);
      
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
        generator: 'custom-generator',
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockRegistry.get).toHaveBeenCalledWith('custom-generator');
      expect(customGenerator.generate).toHaveBeenCalled();
    });
  });

  describe('multiple inputSpec support', () => {
    it('should handle multiple services', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: {
          userService: 'user-api.json',
          productService: 'product-api.json',
          orderService: 'order-api.json',
        },
        outputPath: 'libs/api-clients',
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      
      // Should clean each service directory
      expect(mockRmSync).toHaveBeenCalledTimes(3);
      expect(mockRmSync).toHaveBeenCalledWith('/test/workspace/libs/api-clients/userService', { recursive: true, force: true });
      expect(mockRmSync).toHaveBeenCalledWith('/test/workspace/libs/api-clients/productService', { recursive: true, force: true });
      expect(mockRmSync).toHaveBeenCalledWith('/test/workspace/libs/api-clients/orderService', { recursive: true, force: true });
      
      // Should call generate for each service
      expect(mockGeneratorPlugin.generate).toHaveBeenCalledTimes(3);
      expect(mockGeneratorPlugin.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          inputSpec: 'user-api.json',
          outputPath: 'libs/api-clients/userService',
        })
      );
      expect(mockGeneratorPlugin.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          inputSpec: 'product-api.json',
          outputPath: 'libs/api-clients/productService',
        })
      );
      expect(mockGeneratorPlugin.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          inputSpec: 'order-api.json',
          outputPath: 'libs/api-clients/orderService',
        })
      );
    });

    it('should handle single service in object format', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: {
          api: 'single-api.json',
        },
        outputPath: 'libs/api-client',
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockGeneratorPlugin.generate).toHaveBeenCalledTimes(1);
      expect(mockGeneratorPlugin.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          inputSpec: 'single-api.json',
          outputPath: 'libs/api-client/api',
        })
      );
    });

    it('should handle empty object inputSpec', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: {},
        outputPath: 'libs/api-client',
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockGeneratorPlugin.generate).not.toHaveBeenCalled();
      expect(mockRmSync).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle generator not found', async () => {
      mockRegistry.get.mockReturnValue(undefined);
      // Mock the auto-install to also fail to find the generator
      mockAutoInstaller.ensurePluginInstalled.mockRejectedValue(new Error('Plugin not found'));
      
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
        generator: 'nonexistent-generator',
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('API generation failed with error')
      );
    });

    it('should handle generator not available', async () => {
      mockGeneratorPlugin.isAvailable.mockResolvedValue(false);
      
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('API generation failed with error')
      );
    });

    it('should handle validation errors', async () => {
      mockGeneratorPlugin.validateOptions.mockReturnValue({
        valid: false,
        errors: [{ path: 'inputSpec', message: 'Invalid input specification' }],
      });
      
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'invalid.json',
        outputPath: 'output',
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('API generation failed with error')
      );
    });

    it('should handle generation failure', async () => {
      mockGeneratorPlugin.generate.mockResolvedValue({
        success: false,
        error: new Error('Generation failed'),
      });
      
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('API generation failed')
      );
    });
  });

  describe('auto-installation', () => {
    it('should attempt to load missing generator with auto-install enabled', async () => {
      // Setup to simulate generator not found initially
      mockRegistry.get.mockReturnValueOnce(undefined).mockReturnValueOnce(undefined);
      mockAutoInstaller.ensurePluginInstalled.mockResolvedValue(true);
      mockPluginLoader.loadPlugin.mockResolvedValue(mockGeneratorPlugin);
      
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
        generator: 'missing-generator',
        autoInstall: true,
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockPluginLoader.discoverPlugins).toHaveBeenCalled();
      expect(mockAutoInstaller.ensurePluginInstalled).toHaveBeenCalledWith(
        'missing-generator',
        baseContext,
        expect.objectContaining({ prompt: true, ci: false })
      );
      expect(mockPluginLoader.loadPlugin).toHaveBeenCalledWith('missing-generator');
    });

    it('should handle auto-install failure', async () => {
      mockRegistry.get.mockReturnValue(undefined);
      mockAutoInstaller.ensurePluginInstalled.mockRejectedValue(new Error('Installation failed'));
      
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
        generator: 'missing-generator',
        autoInstall: true,
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(false);
    });
  });
});