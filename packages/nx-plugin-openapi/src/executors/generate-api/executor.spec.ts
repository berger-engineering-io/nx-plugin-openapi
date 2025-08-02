import { ExecutorContext } from '@nx/devkit';
import { GenerateApiExecutorSchema } from './schema';

// Mock external dependencies before importing the executor
const mockSpawn = jest.fn();
const mockRmSync = jest.fn();
const mockJoin = jest.fn();

const mockLog = jest.fn((message: string) => `[test] ${message}`);

const mockLogger = {
  info: jest.fn(),
  verbose: jest.fn(),
  error: jest.fn(),
};

jest.mock('child_process', () => ({
  spawn: mockSpawn,
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

  // Mock child process for spawn
  const mockChildProcess = {
    on: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJoin.mockImplementation((...paths) => paths.join('/'));
    mockRmSync.mockImplementation(() => undefined);
    
    // Setup default successful spawn behavior
    mockSpawn.mockReturnValue(mockChildProcess);
    mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 0); // Success exit code
      }
      return mockChildProcess;
    });
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
      expect(mockSpawn).toHaveBeenCalledWith(
        'node', 
        [
          'node_modules/@openapitools/openapi-generator-cli/main.js',
          'generate',
          '-i', 'openapi.json',
          '-g', 'typescript-angular',
          '-o', 'libs/api-client'
        ],
        {
          stdio: 'inherit',
          cwd: '/test/workspace',
        }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[test] Starting to generate API from provided OpenAPI spec...'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[test] API generation completed successfully.'
      );
    });

    it('should execute with all options provided', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'swagger.yaml',
        outputPath: 'libs/generated-api',
        configFile: 'openapi-config.json',
        skipValidateSpec: true,
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'node',
        [
          'node_modules/@openapitools/openapi-generator-cli/main.js',
          'generate',
          '-i', 'swagger.yaml',
          '-g', 'typescript-angular', 
          '-o', 'libs/generated-api',
          '-c', 'openapi-config.json',
          '--skip-validate-spec'
        ],
        {
          stdio: 'inherit',
          cwd: '/test/workspace',
        }
      );
    });

    it('should include auth option when provided', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
        auth: 'bearer:token123',
      };

      await executor(options, baseContext);

      const spawnArgs = mockSpawn.mock.calls[0][1];
      expect(spawnArgs).toContain('--auth');
      expect(spawnArgs).toContain('bearer:token123');
    });

    it('should include globalProperties as separate arguments', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
        globalProperties: {
          supportsES6: 'true',
          npmName: 'my-api-client',
        },
      };

      await executor(options, baseContext);

      const spawnArgs = mockSpawn.mock.calls[0][1];
      expect(spawnArgs).toContain('--global-property');
      expect(spawnArgs).toContain('supportsES6=true');
      expect(spawnArgs).toContain('npmName=my-api-client');
    });

    it('should handle paths with spaces correctly', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'path with spaces/openapi.json',
        outputPath: 'output with spaces',
        configFile: 'config with spaces/config.json',
      };

      await executor(options, baseContext);

      const spawnArgs = mockSpawn.mock.calls[0][1];
      expect(spawnArgs).toContain('path with spaces/openapi.json');
      expect(spawnArgs).toContain('output with spaces');
      expect(spawnArgs).toContain('config with spaces/config.json');
    });
  });

  describe('error handling', () => {
    it('should handle spawn close event with non-zero exit code', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'openapi.json',
        outputPath: 'libs/api',
      };

      // Mock spawn to return non-zero exit code
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0); // Error exit code
        }
        return mockChildProcess;
      });

      const result = await executor(options, baseContext);

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[test] API generation failed with error'
      );
    });

    it('should handle spawn error event', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'openapi.json',
        outputPath: 'libs/api',
      };

      const error = new Error('Spawn failed');
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(error), 0);
        }
        return mockChildProcess;
      });

      const result = await executor(options, baseContext);

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[test] API generation failed with error'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(error);
    });

    it('should handle rmSync errors', async () => {
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
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[test] API generation failed with error'
      );
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

      await executor(options, contextWithDifferentRoot);

      expect(mockJoin).toHaveBeenCalledWith(
        '/different/workspace/root',
        'relative/path'
      );
      expect(mockRmSync).toHaveBeenCalledWith(
        '/different/workspace/root/relative/path',
        {
          recursive: true,
          force: true,
        }
      );
    });
  });

  describe('logging', () => {
    it('should log start and completion messages', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'test-output',
      };

      await executor(options, baseContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[test] Starting to generate API from provided OpenAPI spec...'
      );
      expect(mockLogger.verbose).toHaveBeenCalledWith(
        '[test] Cleaning outputPath test-output first'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[test] API generation completed successfully.'
      );
    });
  });

  describe('command building', () => {
    it('should use correct working directory', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'spec.json',
        outputPath: 'generated',
      };

      await executor(options, baseContext);

      expect(mockSpawn).toHaveBeenCalledWith(
        'node',
        expect.any(Array),
        {
          stdio: 'inherit',
          cwd: '/test/workspace',
        }
      );
    });

    it('should build command args with all boolean options', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
        enablePostProcessFile: true,
        logToStderr: true,
        minimalUpdate: true,
        removeOperationIdPrefix: true,
        skipOverwrite: true,
        skipOperationExample: true,
        strictSpec: true,
        dryRun: true,
      };

      await executor(options, baseContext);

      const spawnArgs = mockSpawn.mock.calls[0][1];
      expect(spawnArgs).toContain('--enable-post-process-file');
      expect(spawnArgs).toContain('--log-to-stderr');
      expect(spawnArgs).toContain('--minimal-update');
      expect(spawnArgs).toContain('--remove-operation-id-prefix');
      expect(spawnArgs).toContain('--skip-overwrite');
      expect(spawnArgs).toContain('--skip-operation-example');
      expect(spawnArgs).toContain('--strict-spec');
      expect(spawnArgs).toContain('--dry-run');
    });

    it('should handle string values with special characters', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
        httpUserAgent: 'My Custom User Agent 1.0',
        releaseNote: 'This is a test release with special characters & symbols',
      };

      await executor(options, baseContext);

      const spawnArgs = mockSpawn.mock.calls[0][1];
      expect(spawnArgs).toContain('--http-user-agent');
      expect(spawnArgs).toContain('My Custom User Agent 1.0');
      expect(spawnArgs).toContain('--release-note');
      expect(spawnArgs).toContain('This is a test release with special characters & symbols');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string values gracefully', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
        configFile: '',
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      const spawnArgs = mockSpawn.mock.calls[0][1];
      expect(spawnArgs).not.toContain('-c');
      expect(spawnArgs).not.toContain('');
    });

    it('should handle undefined configFile correctly', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
        configFile: undefined,
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      const spawnArgs = mockSpawn.mock.calls[0][1];
      expect(spawnArgs).not.toContain('-c');
    });

    it('should handle empty globalProperties object', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: 'test.json',
        outputPath: 'output',
        globalProperties: {},
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      const spawnArgs = mockSpawn.mock.calls[0][1];
      expect(spawnArgs).not.toContain('--global-property');
    });
  });

  describe('multiple inputSpec support', () => {
    it('should generate multiple APIs when inputSpec is an object', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: {
          'ms-product': 'apps/my-app/ms-product.json',
          'ms-user': 'apps/my-app/ms-user.json',
          'ms-inventory': 'apps/my-app/ms-inventory.json',
        },
        outputPath: 'libs/api/src',
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      
      // Should clean each service directory
      expect(mockRmSync).toHaveBeenCalledTimes(3);
      expect(mockRmSync).toHaveBeenCalledWith(
        '/test/workspace/libs/api/src/ms-product',
        { recursive: true, force: true }
      );
      expect(mockRmSync).toHaveBeenCalledWith(
        '/test/workspace/libs/api/src/ms-user',
        { recursive: true, force: true }
      );
      expect(mockRmSync).toHaveBeenCalledWith(
        '/test/workspace/libs/api/src/ms-inventory',
        { recursive: true, force: true }
      );

      // Should spawn OpenAPI generator for each service
      expect(mockSpawn).toHaveBeenCalledTimes(3);
      
      // Check first service call
      expect(mockSpawn).toHaveBeenNthCalledWith(1,
        'node',
        [
          'node_modules/@openapitools/openapi-generator-cli/main.js',
          'generate',
          '-i', 'apps/my-app/ms-product.json',
          '-g', 'typescript-angular',
          '-o', 'libs/api/src/ms-product'
        ],
        {
          stdio: 'inherit',
          cwd: '/test/workspace',
        }
      );

      // Check second service call
      expect(mockSpawn).toHaveBeenNthCalledWith(2,
        'node',
        [
          'node_modules/@openapitools/openapi-generator-cli/main.js',
          'generate',
          '-i', 'apps/my-app/ms-user.json',
          '-g', 'typescript-angular',
          '-o', 'libs/api/src/ms-user'
        ],
        {
          stdio: 'inherit',
          cwd: '/test/workspace',
        }
      );

      // Check logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[test] Starting to generate APIs from multiple OpenAPI specs...'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[test] Generating API for ms-product...'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[test] API generation for ms-product completed successfully.'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[test] All API generations completed successfully.'
      );
    });

    it('should handle single service in object format', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: {
          'my-service': 'path/to/spec.json',
        },
        outputPath: 'libs/api',
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(mockSpawn).toHaveBeenCalledWith(
        'node',
        [
          'node_modules/@openapitools/openapi-generator-cli/main.js',
          'generate',
          '-i', 'path/to/spec.json',
          '-g', 'typescript-angular',
          '-o', 'libs/api/my-service'
        ],
        {
          stdio: 'inherit',
          cwd: '/test/workspace',
        }
      );
    });

    it('should fail if one service generation fails', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: {
          'ms-product': 'apps/my-app/ms-product.json',
          'ms-user': 'apps/my-app/ms-user.json',
        },
        outputPath: 'libs/api/src',
      };

      let callCount = 0;
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          callCount++;
          // Make the second service fail
          setTimeout(() => callback(callCount === 2 ? 1 : 0), 0);
        }
        return mockChildProcess;
      });

      const result = await executor(options, baseContext);

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[test] API generation failed with error'
      );
    });

    it('should handle empty object inputSpec', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: {},
        outputPath: 'libs/api',
      };

      const result = await executor(options, baseContext);

      expect(result.success).toBe(true);
      expect(mockSpawn).not.toHaveBeenCalled();
      expect(mockRmSync).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[test] All API generations completed successfully.'
      );
    });

    it('should pass additional options to each service generation', async () => {
      const options: GenerateApiExecutorSchema = {
        inputSpec: {
          'service-a': 'spec-a.json',
          'service-b': 'spec-b.json',
        },
        outputPath: 'libs/api',
        skipValidateSpec: true,
        packageName: 'com.example.api',
        globalProperties: {
          supportsES6: 'true',
        },
      };

      await executor(options, baseContext);

      // Check that additional options are passed to both services
      const firstCallArgs = mockSpawn.mock.calls[0][1];
      expect(firstCallArgs).toContain('--skip-validate-spec');
      expect(firstCallArgs).toContain('--package-name');
      expect(firstCallArgs).toContain('com.example.api');
      expect(firstCallArgs).toContain('--global-property');
      expect(firstCallArgs).toContain('supportsES6=true');

      const secondCallArgs = mockSpawn.mock.calls[1][1];
      expect(secondCallArgs).toContain('--skip-validate-spec');
      expect(secondCallArgs).toContain('--package-name');
      expect(secondCallArgs).toContain('com.example.api');
      expect(secondCallArgs).toContain('--global-property');
      expect(secondCallArgs).toContain('supportsES6=true');
    });
  });
});