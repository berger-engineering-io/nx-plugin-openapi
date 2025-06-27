import { ExecutorContext } from '@nx/devkit';
import { GenerateApiExecutorSchema } from './schema';

// Mock external dependencies before importing the executor
const mockExecSync = jest.fn();
const mockRmSync = jest.fn();
const mockJoin = jest.fn();
const mockLogger = {
  info: jest.fn(),
  verbose: jest.fn(),
  error: jest.fn(),
};
const mockLog = jest.fn((message: string) => `[test] ${message}`);

jest.mock('child_process', () => ({
  execSync: mockExecSync,
}));

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
    mockExecSync.mockReturnValue(Buffer.from('success'));
    mockRmSync.mockImplementation(() => undefined);
  });

  describe('successful execution', () => {
    it('should execute with required options only', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'openapi.json',
        outputPath: 'libs/api-client',
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockRmSync).toHaveBeenCalledWith('/test/workspace/libs/api-client', {
        recursive: true,
        force: true,
      });
      expect(mockExecSync).toHaveBeenCalledWith(
        'node node_modules/@openapitools/openapi-generator-cli/main.js generate -i openapi.json -g typescript-angular -o libs/api-client',
        {
          stdio: 'inherit',
          cwd: '/test/workspace',
        }
      );
      expect(mockLogger.info).toHaveBeenCalledWith('[test] Starting to generate API from provided OpenAPI spec...');
      expect(mockLogger.info).toHaveBeenCalledWith('[test] API generation completed successfully.');
    });

    it('should execute with all options provided', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'swagger.yaml',
        outputPath: 'libs/generated-api',
        generatorType: 'typescript-angular',
        configFile: 'openapi-config.json',
        skipValidateSpec: true,
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'node node_modules/@openapitools/openapi-generator-cli/main.js generate -i swagger.yaml -g typescript-angular -o libs/generated-api -c openapi-config.json --skip-validate-spec',
        {
          stdio: 'inherit',
          cwd: '/test/workspace',
        }
      );
    });

    it('should use default generator type when not specified', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'api.json',
        outputPath: 'src/api',
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('-g typescript-angular'),
        expect.any(Object)
      );
    });

    it('should include config file when provided', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'openapi.json',
        outputPath: 'libs/api',
        configFile: 'custom-config.json',
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('-c custom-config.json'),
        expect.any(Object)
      );
    });

    it('should not include config file when not provided', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'openapi.json',
        outputPath: 'libs/api',
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'node node_modules/@openapitools/openapi-generator-cli/main.js generate -i openapi.json -g typescript-angular -o libs/api',
        expect.any(Object)
      );
    });

    it('should include skip-validate-spec when skipValidateSpec is true', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'openapi.json',
        outputPath: 'libs/api',
        skipValidateSpec: true,
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--skip-validate-spec'),
        expect.any(Object)
      );
    });

    it('should not include skip-validate-spec when skipValidateSpec is false', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'openapi.json',
        outputPath: 'libs/api',
        skipValidateSpec: false,
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.not.stringMatching(/--skip-validate-spec/),
        expect.any(Object)
      );
    });

    it('should clean output directory before generation', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'openapi.json',
        outputPath: 'libs/api-client',
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      await executor(options, baseContext);

      expect(mockJoin).toHaveBeenCalledWith('/test/workspace', 'libs/api-client');
      expect(mockRmSync).toHaveBeenCalledWith('/test/workspace/libs/api-client', {
        recursive: true,
        force: true,
      });
      expect(mockLogger.verbose).toHaveBeenCalledWith('[test] Cleaning outputPath libs/api-client first');
    });

    it('should execute command with correct working directory', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'spec.json',
        outputPath: 'generated',
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      await executor(options, baseContext);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.any(String),
        {
          stdio: 'inherit',
          cwd: '/test/workspace',
        }
      );
    });
  });

  describe('error handling', () => {
    it('should handle execSync errors and return failure', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'openapi.json',
        outputPath: 'libs/api',
      };

      const error = new Error('Command failed');
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = await executor(options, baseContext);

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('[test] API generation failed with error');
      expect(mockLogger.error).toHaveBeenCalledWith(error);
    });

    it('should handle rmSync errors and continue execution', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'openapi.json',
        outputPath: 'libs/api',
      };

      const rmError = new Error('Directory not found');
      mockRmSync.mockImplementation(() => {
        throw rmError;
      });

      const result = await executor(options, baseContext);

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('[test] API generation failed with error');
    });

    it('should handle non-Error exceptions', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'openapi.json',
        outputPath: 'libs/api',
      };

      mockExecSync.mockImplementation(() => {
        throw 'String error';
      });

      const result = await executor(options, baseContext);

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('[test] API generation failed with error');
      expect(mockLogger.error).toHaveBeenCalledWith('String error');
    });
  });

  describe('command building', () => {
    it('should build correct command with minimal options', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'minimal.json',
        outputPath: 'output',
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      await executor(options, baseContext);

      expect(mockExecSync).toHaveBeenCalledWith(
        'node node_modules/@openapitools/openapi-generator-cli/main.js generate -i minimal.json -g typescript-angular -o output',
        expect.any(Object)
      );
    });

    it('should build correct command with all options', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'full.yaml',
        outputPath: 'full-output',
        generatorType: 'typescript-angular',
        configFile: 'full-config.json',
        skipValidateSpec: true,
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      await executor(options, baseContext);

      expect(mockExecSync).toHaveBeenCalledWith(
        'node node_modules/@openapitools/openapi-generator-cli/main.js generate -i full.yaml -g typescript-angular -o full-output -c full-config.json --skip-validate-spec',
        expect.any(Object)
      );
    });

    it('should handle paths with spaces correctly', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'path with spaces/openapi.json',
        outputPath: 'output with spaces',
        configFile: 'config with spaces/config.json',
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      await executor(options, baseContext);

      expect(mockExecSync).toHaveBeenCalledWith(
        'node node_modules/@openapitools/openapi-generator-cli/main.js generate -i path with spaces/openapi.json -g typescript-angular -o output with spaces -c config with spaces/config.json',
        expect.any(Object)
      );
    });
  });

  describe('logging', () => {
    it('should log start and completion messages', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'test-output',
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      await executor(options, baseContext);

      expect(mockLogger.info).toHaveBeenCalledWith('[test] Starting to generate API from provided OpenAPI spec...');
      expect(mockLogger.verbose).toHaveBeenCalledWith('[test] Cleaning outputPath test-output first');
      expect(mockLogger.info).toHaveBeenCalledWith('[test] API generation completed successfully.');
    });

    it('should log error messages on failure', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'test-output',
      };

      const error = new Error('Test error');
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      await executor(options, baseContext);

      expect(mockLogger.error).toHaveBeenCalledWith('[test] API generation failed with error');
      expect(mockLogger.error).toHaveBeenCalledWith(error);
    });
  });

  describe('path handling', () => {
    it('should join output path with context root correctly', async () => {
      const contextWithDifferentRoot: ExecutorContext = {
        ...baseContext,
        root: '/different/workspace/root',
      };

      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'relative/path',
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      await executor(options, contextWithDifferentRoot);

      expect(mockJoin).toHaveBeenCalledWith('/different/workspace/root', 'relative/path');
      expect(mockRmSync).toHaveBeenCalledWith('/different/workspace/root/relative/path', {
        recursive: true,
        force: true,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty string values gracefully', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
        configFile: '',
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'node node_modules/@openapitools/openapi-generator-cli/main.js generate -i test.json -g typescript-angular -o output',
        expect.any(Object)
      );
    });

    it('should handle undefined configFile correctly', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
        configFile: undefined,
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'node node_modules/@openapitools/openapi-generator-cli/main.js generate -i test.json -g typescript-angular -o output',
        expect.any(Object)
      );
    });

    it('should handle custom generator type', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
        generatorType: 'custom-generator',
      };

      mockExecSync.mockReturnValue(Buffer.from('success'));

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'node node_modules/@openapitools/openapi-generator-cli/main.js generate -i test.json -g custom-generator -o output',
        expect.any(Object)
      );
    });
  });
});