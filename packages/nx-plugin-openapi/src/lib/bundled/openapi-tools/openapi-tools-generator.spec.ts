import { rmSync } from 'fs';
import { OpenAPIToolsGenerator } from './openapi-tools-generator';
import { GeneratorOptions, GeneratorContext } from '../../core/interfaces';
import { GeneratorValidationError } from '../../core/errors';
import { buildCommandArgs } from '../../../executors/generate-api/utils/build-command';
import { openAPIToolsGeneratorSchema } from './schema';

// Mock external dependencies
jest.mock('fs', () => ({
  rmSync: jest.fn(),
}));

// Don't mock path as it breaks Nx internals
// jest.mock('path', () => ({
//   join: jest.fn(),
//   dirname: jest.fn(),
// }));

jest.mock('../../../executors/generate-api/utils/build-command', () => ({
  buildCommandArgs: jest.fn(),
}));

jest.mock('./schema', () => ({
  openAPIToolsGeneratorSchema: {
    type: 'object',
    properties: {
      inputSpec: { type: 'string' },
      outputPath: { type: 'string' },
    },
    required: ['inputSpec', 'outputPath'],
  },
}));

describe('OpenAPIToolsGenerator', () => {
  let generator: OpenAPIToolsGenerator;
  let mockContext: GeneratorContext;

  const mockRmSync = rmSync as jest.MockedFunction<typeof rmSync>;
  const mockBuildCommandArgs = buildCommandArgs as jest.MockedFunction<typeof buildCommandArgs>;

  beforeEach(() => {
    jest.clearAllMocks();

    generator = new OpenAPIToolsGenerator();
    
    mockContext = {
      root: '/workspace',
      cwd: '/workspace',
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

    // Mock buildCommandArgs to return predictable command arguments
    mockBuildCommandArgs.mockReturnValue(['generate', '-i', 'openapi.json', '-g', 'typescript-angular', '-o', 'output']);

    // Mock executeCommand method to avoid actual command execution
    jest.spyOn(generator as any, 'executeCommand').mockResolvedValue({ // eslint-disable-line @typescript-eslint/no-explicit-any
      stdout: 'Generation completed',
      stderr: '',
      exitCode: 0,
    });
  });

  describe('basic properties', () => {
    it('should have correct name', () => {
      expect(generator.name).toBe('openapi-tools');
    });

    it('should have correct display name', () => {
      expect(generator.displayName).toBe('OpenAPI Generator CLI');
    });

    it('should have correct package name', () => {
      expect(generator.packageName).toBe('@openapitools/openapi-generator-cli');
    });
  });

  describe('getSupportedTypes', () => {
    it('should return supported types', () => {
      const types = generator.getSupportedTypes();
      expect(types).toEqual(['typescript-angular']);
    });
  });

  describe('getSchema', () => {
    it('should return the OpenAPI tools schema', () => {
      const schema = generator.getSchema();
      expect(schema).toBe(openAPIToolsGeneratorSchema);
    });
  });

  describe('single inputSpec generation', () => {
    const singleSpecOptions: GeneratorOptions = {
      inputSpec: 'openapi.json',
      outputPath: 'output',
    };

    it('should generate with single inputSpec successfully', async () => {
      const result = await generator.generate(singleSpecOptions, mockContext);

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toEqual(['output']);
      expect(result.errors).toEqual([]);
    });

    it('should clean output directory before generation', async () => {
      await generator.generate(singleSpecOptions, mockContext);

      expect(mockRmSync).toHaveBeenCalledWith('/workspace/output', {
        recursive: true,
        force: true,
      });
    });

    it('should build command arguments using existing utility', async () => {
      await generator.generate(singleSpecOptions, mockContext);

      expect(mockBuildCommandArgs).toHaveBeenCalledWith(
        expect.objectContaining({
          inputSpec: 'openapi.json',
          outputPath: 'output',
        })
      );
    });

    it('should execute OpenAPI generator command', async () => {
      const executeCommandSpy = jest.spyOn(generator as any, 'executeCommand');

      await generator.generate(singleSpecOptions, mockContext);

      expect(executeCommandSpy).toHaveBeenCalledWith(
        'node',
        ['node_modules/@openapitools/openapi-generator-cli/main.js', ...mockBuildCommandArgs.mock.results[0].value],
        {
          cwd: '/workspace',
          stdio: 'inherit',
        }
      );
    });

    it('should log appropriate messages', async () => {
      const logInfoSpy = jest.spyOn(generator as any, 'logInfo');
      const logVerboseSpy = jest.spyOn(generator as any, 'logVerbose');

      await generator.generate(singleSpecOptions, mockContext);

      expect(logInfoSpy).toHaveBeenCalledWith('Starting to generate API from provided OpenAPI spec...');
      expect(logVerboseSpy).toHaveBeenCalledWith('Cleaning outputPath output first');
      expect(logInfoSpy).toHaveBeenCalledWith('API generation completed successfully.');
    });

    it('should handle additional options', async () => {
      const optionsWithExtras: GeneratorOptions = {
        inputSpec: 'swagger.yaml',
        outputPath: 'generated',
        configFile: 'config.json',
        skipValidateSpec: true,
        auth: 'bearer:token',
      };

      await generator.generate(optionsWithExtras, mockContext);

      expect(mockBuildCommandArgs).toHaveBeenCalledWith(
        expect.objectContaining({
          inputSpec: 'swagger.yaml',
          outputPath: 'generated',
          configFile: 'config.json',
          skipValidateSpec: true,
          auth: 'bearer:token',
        })
      );
    });
  });

  describe('multiple inputSpec generation', () => {
    const multiSpecOptions: GeneratorOptions = {
      inputSpec: {
        'service-a': 'specs/service-a.json',
        'service-b': 'specs/service-b.json',
        'service-c': 'specs/service-c.json',
      },
      outputPath: 'libs/api',
    };

    it('should generate multiple APIs successfully', async () => {
      const result = await generator.generate(multiSpecOptions, mockContext);

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toEqual([
        'libs/api/service-a',
        'libs/api/service-b',
        'libs/api/service-c',
      ]);
    });

    it('should clean each service directory', async () => {
      await generator.generate(multiSpecOptions, mockContext);

      expect(mockRmSync).toHaveBeenCalledTimes(3);
      expect(mockRmSync).toHaveBeenCalledWith('/workspace/libs/api/service-a', {
        recursive: true,
        force: true,
      });
      expect(mockRmSync).toHaveBeenCalledWith('/workspace/libs/api/service-b', {
        recursive: true,
        force: true,
      });
      expect(mockRmSync).toHaveBeenCalledWith('/workspace/libs/api/service-c', {
        recursive: true,
        force: true,
      });
    });

    it('should execute OpenAPI generator for each service', async () => {
      const executeCommandSpy = jest.spyOn(generator as any, 'executeCommand');

      await generator.generate(multiSpecOptions, mockContext);

      expect(executeCommandSpy).toHaveBeenCalledTimes(3);
      
      // Verify each service was processed
      expect(mockBuildCommandArgs).toHaveBeenCalledWith(
        expect.objectContaining({
          inputSpec: 'specs/service-a.json',
          outputPath: 'libs/api/service-a',
        })
      );
      expect(mockBuildCommandArgs).toHaveBeenCalledWith(
        expect.objectContaining({
          inputSpec: 'specs/service-b.json',
          outputPath: 'libs/api/service-b',
        })
      );
      expect(mockBuildCommandArgs).toHaveBeenCalledWith(
        expect.objectContaining({
          inputSpec: 'specs/service-c.json',
          outputPath: 'libs/api/service-c',
        })
      );
    });

    it('should log messages for each service', async () => {
      const logInfoSpy = jest.spyOn(generator as any, 'logInfo');
      const logVerboseSpy = jest.spyOn(generator as any, 'logVerbose');

      await generator.generate(multiSpecOptions, mockContext);

      expect(logInfoSpy).toHaveBeenCalledWith('Starting to generate APIs from multiple OpenAPI specs...');
      expect(logInfoSpy).toHaveBeenCalledWith('Generating API for service-a...');
      expect(logInfoSpy).toHaveBeenCalledWith('Generating API for service-b...');
      expect(logInfoSpy).toHaveBeenCalledWith('Generating API for service-c...');
      expect(logInfoSpy).toHaveBeenCalledWith('API generation for service-a completed successfully.');
      expect(logInfoSpy).toHaveBeenCalledWith('All API generations completed successfully.');
      
      expect(logVerboseSpy).toHaveBeenCalledWith('Cleaning outputPath libs/api/service-a first');
      expect(logVerboseSpy).toHaveBeenCalledWith('Cleaning outputPath libs/api/service-b first');
      expect(logVerboseSpy).toHaveBeenCalledWith('Cleaning outputPath libs/api/service-c first');
    });

    it('should pass additional options to each service', async () => {
      const optionsWithExtras: GeneratorOptions = {
        inputSpec: {
          'service-a': 'specs/service-a.json',
          'service-b': 'specs/service-b.json',
        },
        outputPath: 'libs/api',
        skipValidateSpec: true,
        configFile: 'shared-config.json',
      };

      await generator.generate(optionsWithExtras, mockContext);

      // Verify options are passed to each service
      expect(mockBuildCommandArgs).toHaveBeenCalledWith(
        expect.objectContaining({
          inputSpec: 'specs/service-a.json',
          outputPath: 'libs/api/service-a',
          skipValidateSpec: true,
          configFile: 'shared-config.json',
        })
      );
      expect(mockBuildCommandArgs).toHaveBeenCalledWith(
        expect.objectContaining({
          inputSpec: 'specs/service-b.json',
          outputPath: 'libs/api/service-b',
          skipValidateSpec: true,
          configFile: 'shared-config.json',
        })
      );
    });

    it('should handle single service in object format', async () => {
      const singleServiceOptions: GeneratorOptions = {
        inputSpec: {
          'my-service': 'specs/my-service.json',
        },
        outputPath: 'libs/api',
      };

      const result = await generator.generate(singleServiceOptions, mockContext);

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toEqual(['libs/api/my-service']);
      expect(mockRmSync).toHaveBeenCalledTimes(1);
      expect(mockBuildCommandArgs).toHaveBeenCalledWith(
        expect.objectContaining({
          inputSpec: 'specs/my-service.json',
          outputPath: 'libs/api/my-service',
        })
      );
    });

    it('should handle empty services object', async () => {
      const emptyServicesOptions: GeneratorOptions = {
        inputSpec: {},
        outputPath: 'libs/api',
      };

      // This should fail validation, but let's test the behavior if it somehow gets through
      (generator as any).validateOptionsOrThrow = jest.fn(); // Skip validation for this test

      const result = await generator.generate(emptyServicesOptions, mockContext);

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toEqual([]);
      expect(mockRmSync).not.toHaveBeenCalled();
      expect(mockBuildCommandArgs).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should validate options before generation', async () => {
      const invalidOptions: GeneratorOptions = {
        inputSpec: '',
        outputPath: 'output',
      };

      await expect(generator.generate(invalidOptions, mockContext)).rejects.toThrow(GeneratorValidationError);
    });

    it('should pass validation for valid single spec options', () => {
      const options: GeneratorOptions = {
        inputSpec: 'openapi.json',
        outputPath: 'output',
      };

      const result = generator.validate(options);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for valid multiple spec options', () => {
      const options: GeneratorOptions = {
        inputSpec: {
          'service-a': 'specs/service-a.json',
          'service-b': 'specs/service-b.json',
        },
        outputPath: 'output',
      };

      const result = generator.validate(options);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have no custom validation errors by default', () => {
      const options: GeneratorOptions = {
        inputSpec: 'openapi.json',
        outputPath: 'output',
      };

      // Call the protected validateCustomOptions method
      const customValidation = (generator as any).validateCustomOptions(options);
      expect(customValidation.valid).toBe(true);
      expect(customValidation.errors).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle command execution failure', async () => {
      const executeCommandSpy = jest.spyOn(generator as any, 'executeCommand')
        .mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'Error occurred' });

      const options: GeneratorOptions = {
        inputSpec: 'openapi.json',
        outputPath: 'output',
      };

      const result = await generator.generate(options, mockContext);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('OpenAPI Generator exited with code 1');
    });

    it('should handle command execution exception', async () => {
      const executeCommandSpy = jest.spyOn(generator as any, 'executeCommand')
        .mockRejectedValue(new Error('Command failed to execute'));

      const options: GeneratorOptions = {
        inputSpec: 'openapi.json',
        outputPath: 'output',
      };

      const result = await generator.generate(options, mockContext);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Command failed to execute');
    });

    it('should handle validation errors gracefully', async () => {
      const options: GeneratorOptions = {
        inputSpec: '', // Invalid
        outputPath: 'output',
      };

      await expect(generator.generate(options, mockContext)).rejects.toThrow(GeneratorValidationError);
    });

    it('should handle file system errors during cleanup', async () => {
      mockRmSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const options: GeneratorOptions = {
        inputSpec: 'openapi.json',
        outputPath: 'output',
      };

      const result = await generator.generate(options, mockContext);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Permission denied');
    });

    it('should fail fast on first service error in multi-service generation', async () => {
      let callCount = 0;
      const executeCommandSpy = jest.spyOn(generator as any, 'executeCommand')
        .mockImplementation(() => {
          callCount++;
          if (callCount === 2) {
            // Second service fails
            return Promise.resolve({ exitCode: 1, stdout: '', stderr: 'Service B failed' });
          }
          return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
        });

      const multiSpecOptions: GeneratorOptions = {
        inputSpec: {
          'service-a': 'specs/service-a.json',
          'service-b': 'specs/service-b.json',
          'service-c': 'specs/service-c.json',
        },
        outputPath: 'libs/api',
      };

      const result = await generator.generate(multiSpecOptions, mockContext);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('OpenAPI Generator exited with code 1');
      // Should have stopped at second service
      expect(executeCommandSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('convertToExecutorOptions', () => {
    it('should convert GeneratorOptions to GenerateApiExecutorSchema', () => {
      const generatorOptions: GeneratorOptions = {
        inputSpec: 'openapi.json',
        outputPath: 'output',
        configFile: 'config.json',
        skipValidateSpec: true,
        auth: 'bearer:token',
        apiNameSuffix: 'API',
        globalProperties: { 'supportsES6': 'true' },
        dryRun: false,
      };

      const convertedOptions = (generator as any).convertToExecutorOptions(generatorOptions);

      expect(convertedOptions).toEqual({
        inputSpec: 'openapi.json',
        outputPath: 'output',
        configFile: 'config.json',
        skipValidateSpec: true,
        auth: 'bearer:token',
        apiNameSuffix: 'API',
        apiPackage: undefined,
        artifactId: undefined,
        artifactVersion: undefined,
        dryRun: false,
        enablePostProcessFile: undefined,
        gitHost: undefined,
        gitRepoId: undefined,
        gitUserId: undefined,
        globalProperties: { 'supportsES6': 'true' },
        groupId: undefined,
        httpUserAgent: undefined,
        ignoreFileOverride: undefined,
        inputSpecRootDirectory: undefined,
        invokerPackage: undefined,
        logToStderr: undefined,
        minimalUpdate: undefined,
        modelNamePrefix: undefined,
        modelNameSuffix: undefined,
        modelPackage: undefined,
        packageName: undefined,
        releaseNote: undefined,
        removeOperationIdPrefix: undefined,
        skipOverwrite: undefined,
        skipOperationExample: undefined,
        strictSpec: undefined,
        templateDirectory: undefined,
      });
    });

    it('should handle undefined optional properties', () => {
      const generatorOptions: GeneratorOptions = {
        inputSpec: 'openapi.json',
        outputPath: 'output',
      };

      const convertedOptions = (generator as any).convertToExecutorOptions(generatorOptions);

      expect(convertedOptions.inputSpec).toBe('openapi.json');
      expect(convertedOptions.outputPath).toBe('output');
      expect(convertedOptions.configFile).toBeUndefined();
      expect(convertedOptions.skipValidateSpec).toBeUndefined();
    });
  });

  describe('backward compatibility', () => {
    it('should maintain compatibility with existing executor implementation', async () => {
      const options: GeneratorOptions = {
        inputSpec: 'openapi.json',
        outputPath: 'output',
        configFile: 'config.json',
        skipValidateSpec: true,
      };

      await generator.generate(options, mockContext);

      // Verify that buildCommandArgs is called with executor schema format
      const calledWith = mockBuildCommandArgs.mock.calls[0][0];
      expect(calledWith).toMatchObject({
        inputSpec: 'openapi.json',
        outputPath: 'output',
        configFile: 'config.json',
        skipValidateSpec: true,
      });

      // Verify command execution matches executor format
      const executeCommandSpy = jest.spyOn(generator as any, 'executeCommand');
      expect(executeCommandSpy).toHaveBeenCalledWith(
        'node',
        ['node_modules/@openapitools/openapi-generator-cli/main.js', ...mockBuildCommandArgs.mock.results[0].value],
        expect.objectContaining({
          cwd: '/workspace',
          stdio: 'inherit',
        })
      );
    });

    it('should use typescript-angular generator by default like the executor', async () => {
      const options: GeneratorOptions = {
        inputSpec: 'openapi.json',
        outputPath: 'output',
      };

      await generator.generate(options, mockContext);

      // The buildCommandArgs utility should be called, which handles the default generator
      expect(mockBuildCommandArgs).toHaveBeenCalled();
    });
  });

  describe('path handling', () => {
    it('should construct correct absolute paths', async () => {
      const options: GeneratorOptions = {
        inputSpec: 'openapi.json',
        outputPath: 'relative/output',
      };

      await generator.generate(options, mockContext);

      // Path joining will use the actual join function
      expect(mockRmSync).toHaveBeenCalledWith('/workspace/relative/output', {
        recursive: true,
        force: true,
      });
    });

    it('should handle nested service paths correctly', async () => {
      const options: GeneratorOptions = {
        inputSpec: {
          'deep/service': 'specs/deep-service.json',
        },
        outputPath: 'libs/api',
      };

      await generator.generate(options, mockContext);

      // Path joining will use the actual join function for these paths
    });
  });

  describe('logging behavior', () => {
    it('should use inherited logging methods', async () => {
      const logInfoSpy = jest.spyOn(generator as any, 'logInfo');
      const logVerboseSpy = jest.spyOn(generator as any, 'logVerbose');

      const options: GeneratorOptions = {
        inputSpec: 'openapi.json',
        outputPath: 'output',
      };

      await generator.generate(options, mockContext);

      // Verify logging methods are called with proper generator prefix
      expect(logInfoSpy).toHaveBeenCalledWith(expect.any(String));
      expect(logVerboseSpy).toHaveBeenCalledWith(expect.any(String));
    });
  });
});