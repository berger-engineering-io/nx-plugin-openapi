import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { OpenApiToolsGenerator } from './openapi-tools-generator';
import {
  buildCommandArgs,
  OpenApiGeneratorOptions,
} from './utils/build-command';
import { GenerateOptionsBase, GeneratorContext } from '@nx-plugin-openapi/core';

// Mock node:child_process
jest.mock('node:child_process', () => ({
  spawn: jest.fn(),
}));

// Mock build-command utility
jest.mock('./utils/build-command', () => ({
  buildCommandArgs: jest.fn(),
}));

type MockChildProcess = EventEmitter & { on: jest.Mock };
type GeneratorWithCleanOutput = {
  cleanOutput: (...args: unknown[]) => unknown;
};

describe('OpenApiToolsGenerator', () => {
  let generator: OpenApiToolsGenerator;
  let mockContext: GeneratorContext;
  let mockChildProcess: MockChildProcess;
  let generatorWithCleanOutput: GeneratorWithCleanOutput;
  let cleanOutputSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new OpenApiToolsGenerator();
    // Disable retries for failing tests to make them predictable
    generator.setRetryOptions({
      maxAttempts: 1,
      delayMs: 0,
      backoffMultiplier: 1,
    });
    mockContext = {
      root: '/workspace',
      workspaceName: 'test-workspace',
    };

    // Create a mock child process
    mockChildProcess = new EventEmitter() as MockChildProcess;
    mockChildProcess.on = jest.fn(mockChildProcess.on.bind(mockChildProcess));
    (spawn as jest.Mock).mockReturnValue(mockChildProcess);

    // Mock buildCommandArgs to return test args
    (buildCommandArgs as jest.Mock).mockImplementation((options) => [
      'generate',
      '-i',
      options.inputSpec,
      '-o',
      options.outputPath,
    ]);

    // Mock cleanOutput method
    generatorWithCleanOutput = generator as unknown as GeneratorWithCleanOutput;
    cleanOutputSpy = jest
      .spyOn(generatorWithCleanOutput, 'cleanOutput')
      .mockImplementation(() => {});
  });

  describe('name', () => {
    it('should have correct plugin name', () => {
      expect(generator.name).toBe('openapi-tools');
    });
  });

  describe('generate', () => {
    describe('with single input spec', () => {
      it('should clean output and execute generator', async () => {
        const options = {
          inputSpec: 'api.yaml',
          outputPath: 'src/generated',
          generatorOptions: {
            generator: 'typescript-axios',
          },
        };

        const generatePromise = generator.generate(options, mockContext);

        // Simulate successful execution
        process.nextTick(() => mockChildProcess.emit('close', 0));

        await generatePromise;

        expect(cleanOutputSpy).toHaveBeenCalledWith(
          mockContext,
          'src/generated'
        );
        expect(buildCommandArgs).toHaveBeenCalledWith({
          generator: 'typescript-axios',
          inputSpec: 'api.yaml',
          outputPath: 'src/generated',
        });
        expect(spawn).toHaveBeenCalledWith(
          'node',
          [
            'node_modules/@openapitools/openapi-generator-cli/main.js',
            'generate',
            '-i',
            'api.yaml',
            '-o',
            'src/generated',
          ],
          { cwd: '/workspace', stdio: 'inherit' }
        );
      });

      it('should handle generator failure', async () => {
        const options = {
          inputSpec: 'api.yaml',
          outputPath: 'src/generated',
        };

        const generatePromise = generator.generate(options, mockContext);

        // Simulate failure on all attempts
        let attemptCount = 0;
        (spawn as jest.Mock).mockImplementation(() => {
          attemptCount++;
          const childProcess = new EventEmitter() as MockChildProcess;
          childProcess.on = jest.fn(childProcess.on.bind(childProcess));
          process.nextTick(() => childProcess.emit('close', 1));
          return childProcess;
        });

        await expect(generatePromise).rejects.toThrow(
          'Failed to generate code after 1 attempts'
        );
        expect(attemptCount).toBe(1);
      }, 10000);

      it('should handle process error', async () => {
        const options = {
          inputSpec: 'api.yaml',
          outputPath: 'src/generated',
        };

        const generatePromise = generator.generate(options, mockContext);

        // Simulate error on all attempts
        let attemptCount = 0;
        (spawn as jest.Mock).mockImplementation(() => {
          attemptCount++;
          const childProcess = new EventEmitter() as MockChildProcess;
          childProcess.on = jest.fn(childProcess.on.bind(childProcess));
          const error = new Error('Process error');
          process.nextTick(() => childProcess.emit('error', error));
          return childProcess;
        });

        await expect(generatePromise).rejects.toThrow(
          'Failed to generate code after 1 attempts'
        );
        expect(attemptCount).toBe(1);
      }, 10000);

      it('should pass generator options correctly', async () => {
        const options = {
          inputSpec: 'spec.json',
          outputPath: 'dist/api',
          generatorOptions: {
            generator: 'typescript-fetch',
            additionalProperties: { withInterfaces: true },
          },
        };

        const generatePromise = generator.generate(options, mockContext);
        process.nextTick(() => mockChildProcess.emit('close', 0));

        await generatePromise;

        expect(buildCommandArgs).toHaveBeenCalledWith({
          generator: 'typescript-fetch',
          additionalProperties: { withInterfaces: true },
          inputSpec: 'spec.json',
          outputPath: 'dist/api',
        });
      });

      it('should handle empty generator options', async () => {
        const options = {
          inputSpec: 'api.yaml',
          outputPath: 'src/generated',
        };

        const generatePromise = generator.generate(options, mockContext);
        process.nextTick(() => mockChildProcess.emit('close', 0));

        await generatePromise;

        expect(buildCommandArgs).toHaveBeenCalledWith({
          inputSpec: 'api.yaml',
          outputPath: 'src/generated',
        });
      });
    });

    describe('with multiple input specs', () => {
      it('should process each spec separately', async () => {
        const options = {
          inputSpec: {
            users: 'users.yaml',
            products: 'products.yaml',
            orders: 'orders.yaml',
          },
          outputPath: 'src/api',
          generatorOptions: {
            generator: 'typescript-axios',
          },
        } as unknown as OpenApiGeneratorOptions & GenerateOptionsBase;

        const generatePromise = generator.generate(options, mockContext);

        // Simulate successful execution for all three
        const emitClose = () => mockChildProcess.emit('close', 0);
        await emitClose();
        await new Promise((resolve) => setTimeout(resolve, 0));
        await emitClose();
        await new Promise((resolve) => setTimeout(resolve, 0));
        await emitClose();

        await generatePromise;

        // Should clean output for each service
        expect(cleanOutputSpy).toHaveBeenCalledTimes(3);
        expect(cleanOutputSpy).toHaveBeenCalledWith(
          mockContext,
          'src/api/users'
        );
        expect(cleanOutputSpy).toHaveBeenCalledWith(
          mockContext,
          'src/api/products'
        );
        expect(cleanOutputSpy).toHaveBeenCalledWith(
          mockContext,
          'src/api/orders'
        );

        // Should build command args for each service
        expect(buildCommandArgs).toHaveBeenCalledTimes(3);
        expect(buildCommandArgs).toHaveBeenCalledWith({
          generator: 'typescript-axios',
          inputSpec: 'users.yaml',
          outputPath: 'src/api/users',
        });
        expect(buildCommandArgs).toHaveBeenCalledWith({
          generator: 'typescript-axios',
          inputSpec: 'products.yaml',
          outputPath: 'src/api/products',
        });
        expect(buildCommandArgs).toHaveBeenCalledWith({
          generator: 'typescript-axios',
          inputSpec: 'orders.yaml',
          outputPath: 'src/api/orders',
        });

        // Should spawn process for each service
        expect(spawn).toHaveBeenCalledTimes(3);
      });

      it('should handle failure in one of multiple specs', async () => {
        const options = {
          inputSpec: {
            users: 'users.yaml',
            products: 'products.yaml',
          },
          outputPath: 'src/api',
        } as unknown as OpenApiGeneratorOptions & GenerateOptionsBase;

        const generatePromise = generator.generate(options, mockContext);

        // Mock spawn to simulate first succeeding, second failing
        let callCount = 0;
        (spawn as jest.Mock).mockImplementation(() => {
          callCount++;
          const childProcess = new EventEmitter() as MockChildProcess;
          childProcess.on = jest.fn(childProcess.on.bind(childProcess));
          
          if (callCount === 1) {
            // First call succeeds
            process.nextTick(() => childProcess.emit('close', 0));
          } else {
            // Subsequent calls fail
            process.nextTick(() => childProcess.emit('close', 1));
          }
          
          return childProcess;
        });

        await expect(generatePromise).rejects.toThrow(
          'Failed to generate code after 1 attempts'
        );
      }, 10000);

      it('should maintain service output structure', async () => {
        const options = {
          inputSpec: {
            'user-service': 'specs/users.yaml',
            'product-service': 'specs/products.yaml',
          },
          outputPath: 'generated',
        } as unknown as OpenApiGeneratorOptions & GenerateOptionsBase;

        const generatePromise = generator.generate(options, mockContext);

        process.nextTick(() => mockChildProcess.emit('close', 0));
        setTimeout(() => mockChildProcess.emit('close', 0), 10);

        await generatePromise;

        expect(buildCommandArgs).toHaveBeenCalledWith(
          expect.objectContaining({
            outputPath: 'generated/user-service',
          })
        );
        expect(buildCommandArgs).toHaveBeenCalledWith(
          expect.objectContaining({
            outputPath: 'generated/product-service',
          })
        );
      });
    });

    describe('process spawning', () => {
      it('should use correct node executable path', async () => {
        const options = {
          inputSpec: 'api.yaml',
          outputPath: 'output',
        };

        const generatePromise = generator.generate(options, mockContext);
        process.nextTick(() => mockChildProcess.emit('close', 0));

        await generatePromise;

        expect(spawn).toHaveBeenCalledWith(
          'node',
          expect.arrayContaining([
            'node_modules/@openapitools/openapi-generator-cli/main.js',
          ]),
          expect.any(Object)
        );
      });

      it('should use workspace root as cwd', async () => {
        const options = {
          inputSpec: 'api.yaml',
          outputPath: 'output',
        };

        const generatePromise = generator.generate(options, mockContext);
        process.nextTick(() => mockChildProcess.emit('close', 0));

        await generatePromise;

        expect(spawn).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Array),
          expect.objectContaining({
            cwd: '/workspace',
          })
        );
      });

      it('should inherit stdio', async () => {
        const options = {
          inputSpec: 'api.yaml',
          outputPath: 'output',
        };

        const generatePromise = generator.generate(options, mockContext);
        process.nextTick(() => mockChildProcess.emit('close', 0));

        await generatePromise;

        expect(spawn).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Array),
          expect.objectContaining({
            stdio: 'inherit',
          })
        );
      });
    });
  });

  describe('inheritance', () => {
    it('should extend BaseGenerator', () => {
      expect(generator).toHaveProperty('cleanOutput');
    });

    it('should implement GeneratorPlugin interface', () => {
      expect(generator).toHaveProperty('name');
      expect(generator).toHaveProperty('generate');
      expect(typeof generator.generate).toBe('function');
    });
  });
});
