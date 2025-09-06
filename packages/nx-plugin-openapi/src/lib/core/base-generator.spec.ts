import { logger } from '@nx/devkit';
import { spawn } from 'child_process';
import { BaseGenerator } from './base-generator';
import { GeneratorOptions, GeneratorContext, GeneratorResult, GeneratorSchema } from './interfaces';
import { GeneratorValidationError, GeneratorExecutionError, wrapError } from './errors';

// Mock external dependencies
jest.mock('@nx/devkit', () => ({
  logger: {
    info: jest.fn(),
    verbose: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

// Create a concrete implementation for testing
class TestGenerator extends BaseGenerator {
  public readonly name = 'test-generator';
  public readonly displayName = 'Test Generator';
  public readonly packageName = 'test-package';

  private shouldFailGeneration = false;
  private generationError: Error | null = null;

  public async generate(options: GeneratorOptions, context: GeneratorContext): Promise<GeneratorResult> {
    this.validateOptionsOrThrow(options);
    
    if (this.shouldFailGeneration) {
      if (this.generationError) {
        throw this.generationError;
      }
      throw new Error('Generation failed');
    }

    return this.createSuccessResult(['output/file1.ts', 'output/file2.ts']);
  }

  public getSupportedTypes(): string[] {
    return ['typescript', 'javascript'];
  }

  public getSchema(): GeneratorSchema {
    return {
      type: 'object',
      properties: {
        inputSpec: { type: 'string' },
        outputPath: { type: 'string' },
        customOption: { type: 'string' }
      },
      required: ['inputSpec', 'outputPath']
    };
  }

  // Test helpers
  public setFailGeneration(shouldFail: boolean, error?: Error) {
    this.shouldFailGeneration = shouldFail;
    this.generationError = error || null;
  }

  // Expose protected methods for testing
  public testExecuteCommand(command: string, args: string[], options: any) {
    return this.executeCommand(command, args, options);
  }

  public testValidateOptionsOrThrow(options: GeneratorOptions) {
    return this.validateOptionsOrThrow(options);
  }

  public testCreateSuccessResult(generatedFiles?: string[], warnings?: string[], metadata?: Record<string, any>) {
    return this.createSuccessResult(generatedFiles, warnings, metadata);
  }

  public testCreateFailureResult(errors: string[], warnings?: string[], metadata?: Record<string, any>) {
    return this.createFailureResult(errors, warnings, metadata);
  }

  public testHandleGenerationError(error: unknown, operationName: string) {
    return this.handleGenerationError(error, operationName);
  }

  public testMergeWithDefaults(options: GeneratorOptions, defaults: Partial<GeneratorOptions>) {
    return this.mergeWithDefaults(options, defaults);
  }

  public testSanitizeOptions(options: GeneratorOptions) {
    return this.sanitizeOptions(options);
  }

  protected validateCustomOptions(options: GeneratorOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Add some custom validation for testing
    if (options.customOption && typeof options.customOption !== 'string') {
      errors.push('customOption must be a string');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

describe('BaseGenerator', () => {
  let generator: TestGenerator;
  let mockContext: GeneratorContext;
  let mockChildProcess: any;

  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

  beforeEach(() => {
    jest.clearAllMocks();

    generator = new TestGenerator();
    
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

    // Mock child process
    mockChildProcess = {
      stdout: {
        on: jest.fn(),
      },
      stderr: {
        on: jest.fn(),
      },
      on: jest.fn(),
      kill: jest.fn(),
    };
    mockSpawn.mockReturnValue(mockChildProcess);
  });

  describe('abstract implementation', () => {
    it('should have required abstract properties', () => {
      expect(generator.name).toBe('test-generator');
      expect(generator.displayName).toBe('Test Generator');
      expect(generator.packageName).toBe('test-package');
    });

    it('should implement required abstract methods', () => {
      expect(typeof generator.generate).toBe('function');
      expect(typeof generator.getSupportedTypes).toBe('function');
      expect(typeof generator.getSchema).toBe('function');
    });

    it('should return supported types', () => {
      const types = generator.getSupportedTypes();
      expect(types).toEqual(['typescript', 'javascript']);
    });

    it('should return schema definition', () => {
      const schema = generator.getSchema();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.required).toEqual(['inputSpec', 'outputPath']);
    });
  });

  describe('validation', () => {
    describe('basic validation', () => {
      it('should pass validation for valid options', () => {
        const options: GeneratorOptions = {
          inputSpec: 'openapi.json',
          outputPath: 'output',
        };

        const result = generator.validate(options);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail validation for missing inputSpec', () => {
        const options: GeneratorOptions = {
          inputSpec: '',
          outputPath: 'output',
        };

        const result = generator.validate(options);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('inputSpec is required');
      });

      it('should fail validation for missing outputPath', () => {
        const options: GeneratorOptions = {
          inputSpec: 'openapi.json',
          outputPath: '',
        };

        const result = generator.validate(options);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('outputPath is required');
      });

      it('should validate inputSpec type', () => {
        const options = {
          inputSpec: 123, // Invalid type
          outputPath: 'output',
        } as any;

        const result = generator.validate(options);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('inputSpec must be a string or object');
      });

      it('should validate outputPath type', () => {
        const options = {
          inputSpec: 'openapi.json',
          outputPath: 123, // Invalid type
        } as any;

        const result = generator.validate(options);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('outputPath must be a string');
      });
    });

    describe('multiple inputSpec validation', () => {
      it('should validate multiple inputSpec object', () => {
        const options: GeneratorOptions = {
          inputSpec: {
            'service1': 'spec1.json',
            'service2': 'spec2.json',
          },
          outputPath: 'output',
        };

        const result = generator.validate(options);
        expect(result.valid).toBe(true);
      });

      it('should reject empty inputSpec object', () => {
        const options: GeneratorOptions = {
          inputSpec: {},
          outputPath: 'output',
        };

        const result = generator.validate(options);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('inputSpec object cannot be empty');
      });

      it('should validate service names in inputSpec object', () => {
        const options: GeneratorOptions = {
          inputSpec: {
            '': 'spec1.json', // Invalid empty service name
            'service2': 'spec2.json',
          },
          outputPath: 'output',
        };

        const result = generator.validate(options);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('All service names in inputSpec must be non-empty strings');
      });

      it('should validate spec paths in inputSpec object', () => {
        const options: GeneratorOptions = {
          inputSpec: {
            'service1': '', // Invalid empty spec path
            'service2': 'spec2.json',
          },
          outputPath: 'output',
        };

        const result = generator.validate(options);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Spec path for service 'service1' must be a non-empty string");
      });
    });

    describe('custom validation', () => {
      it('should include custom validation errors', () => {
        const options: GeneratorOptions = {
          inputSpec: 'openapi.json',
          outputPath: 'output',
          customOption: 123, // Invalid type for custom validation
        };

        const result = generator.validate(options);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('customOption must be a string');
      });

      it('should combine base and custom validation errors', () => {
        const options: GeneratorOptions = {
          inputSpec: '', // Base validation error
          outputPath: 'output',
          customOption: 123, // Custom validation error
        };

        const result = generator.validate(options);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('inputSpec is required');
        expect(result.errors).toContain('customOption must be a string');
      });
    });

    describe('validateOptionsOrThrow', () => {
      it('should not throw for valid options', () => {
        const options: GeneratorOptions = {
          inputSpec: 'openapi.json',
          outputPath: 'output',
        };

        expect(() => generator.testValidateOptionsOrThrow(options)).not.toThrow();
      });

      it('should throw GeneratorValidationError for invalid options', () => {
        const options: GeneratorOptions = {
          inputSpec: '',
          outputPath: 'output',
        };

        expect(() => generator.testValidateOptionsOrThrow(options)).toThrow(GeneratorValidationError);
      });

      it('should include validation errors in exception', () => {
        const options: GeneratorOptions = {
          inputSpec: '',
          outputPath: '',
        };

        try {
          generator.testValidateOptionsOrThrow(options);
        } catch (error) {
          expect(error).toBeInstanceOf(GeneratorValidationError);
          expect((error as GeneratorValidationError).details?.validationErrors).toContain('inputSpec is required');
          expect((error as GeneratorValidationError).details?.validationErrors).toContain('outputPath is required');
        }
      });
    });
  });

  describe('command execution', () => {
    beforeEach(() => {
      // Setup successful command execution by default
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0); // Success exit code
        }
        return mockChildProcess;
      });
    });

    it('should execute command successfully', async () => {
      const result = await generator.testExecuteCommand('node', ['--version'], { cwd: '/workspace' });

      expect(mockSpawn).toHaveBeenCalledWith('node', ['--version'], {
        cwd: '/workspace',
        stdio: 'pipe',
      });
      expect(result.exitCode).toBe(0);
    });

    it('should handle command with custom stdio', async () => {
      await generator.testExecuteCommand('node', ['--version'], { 
        cwd: '/workspace',
        stdio: 'inherit' 
      });

      expect(mockSpawn).toHaveBeenCalledWith('node', ['--version'], {
        cwd: '/workspace',
        stdio: 'inherit',
      });
    });

    it('should capture stdout and stderr', async () => {
      const stdoutData = 'Success output';
      const stderrData = 'Warning message';

      mockChildProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(stdoutData)), 0);
        }
      });

      mockChildProcess.stderr.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(stderrData)), 0);
        }
      });

      const result = await generator.testExecuteCommand('node', ['--version'], { cwd: '/workspace' });

      expect(result.stdout).toBe(stdoutData);
      expect(result.stderr).toBe(stderrData);
      expect(result.exitCode).toBe(0);
    });

    it('should handle command timeout', async () => {
      const promise = generator.testExecuteCommand('node', ['--version'], { 
        cwd: '/workspace',
        timeout: 100 
      });

      // Setup timeout to occur
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          // Don't call the close callback to simulate timeout
          return mockChildProcess;
        }
        return mockChildProcess;
      });

      await expect(promise).rejects.toThrow('Command timed out after 100ms');
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should handle command errors', async () => {
      const error = new Error('Command failed');
      
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(error), 0);
        }
      });

      await expect(generator.testExecuteCommand('node', ['--version'], { cwd: '/workspace' }))
        .rejects.toThrow('Command failed');
    });

    it('should handle non-zero exit codes', async () => {
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0); // Error exit code
        }
        return mockChildProcess;
      });

      const result = await generator.testExecuteCommand('node', ['--version'], { cwd: '/workspace' });
      expect(result.exitCode).toBe(1);
    });

    it('should log verbose messages for command execution', async () => {
      await generator.testExecuteCommand('node', ['--version'], { cwd: '/workspace' });

      expect(mockLogger.verbose).toHaveBeenCalledWith(
        '[test-generator] Executing command: node --version'
      );
    });

    it('should log stdout/stderr when not using inherit stdio', async () => {
      const stdoutData = 'Output data';
      
      mockChildProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(stdoutData)), 0);
        }
      });

      await generator.testExecuteCommand('node', ['--version'], { cwd: '/workspace' });

      expect(mockLogger.verbose).toHaveBeenCalledWith('[test-generator] STDOUT: Output data');
    });
  });

  describe('result creation', () => {
    describe('success results', () => {
      it('should create success result with minimal data', () => {
        const result = generator.testCreateSuccessResult();

        expect(result.success).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual([]);
        expect(result.generatedFiles).toBeUndefined();
        expect(result.metadata).toBeUndefined();
      });

      it('should create success result with generated files', () => {
        const files = ['file1.ts', 'file2.ts'];
        const result = generator.testCreateSuccessResult(files);

        expect(result.success).toBe(true);
        expect(result.generatedFiles).toEqual(files);
      });

      it('should create success result with warnings', () => {
        const warnings = ['Warning 1', 'Warning 2'];
        const result = generator.testCreateSuccessResult([], warnings);

        expect(result.success).toBe(true);
        expect(result.warnings).toEqual(warnings);
      });

      it('should create success result with metadata', () => {
        const metadata = { duration: 1000, generatorVersion: '1.0.0' };
        const result = generator.testCreateSuccessResult([], [], metadata);

        expect(result.success).toBe(true);
        expect(result.metadata).toEqual(metadata);
      });
    });

    describe('failure results', () => {
      it('should create failure result with errors', () => {
        const errors = ['Error 1', 'Error 2'];
        const result = generator.testCreateFailureResult(errors);

        expect(result.success).toBe(false);
        expect(result.errors).toEqual(errors);
        expect(result.warnings).toEqual([]);
      });

      it('should create failure result with warnings and metadata', () => {
        const errors = ['Error'];
        const warnings = ['Warning'];
        const metadata = { failureReason: 'validation' };
        
        const result = generator.testCreateFailureResult(errors, warnings, metadata);

        expect(result.success).toBe(false);
        expect(result.errors).toEqual(errors);
        expect(result.warnings).toEqual(warnings);
        expect(result.metadata).toEqual(metadata);
      });
    });
  });

  describe('error handling', () => {
    it('should handle generation errors', () => {
      const error = new Error('Generation failed');
      const result = generator.testHandleGenerationError(error, 'Test Operation');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Generation failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[test-generator] Test Operation failed: Generator \'unknown\' execution failed: Generation failed'
      );
    });

    it('should handle GeneratorExecutionError with details', () => {
      const executionError = new GeneratorExecutionError(
        'test-generator',
        new Error('Command failed'),
        1,
        'stdout output',
        'stderr output'
      );
      
      const result = generator.testHandleGenerationError(executionError, 'Test Operation');

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[test-generator] STDERR: stderr output'
      );
      expect(mockLogger.verbose).toHaveBeenCalledWith(
        '[test-generator] STDOUT: stdout output'
      );
    });

    it('should wrap non-Error objects', () => {
      const result = generator.testHandleGenerationError('String error', 'Test Operation');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('String error');
    });
  });

  describe('logging utilities', () => {
    it('should log info messages with prefix', () => {
      (generator as any).logInfo('Test info message');
      expect(mockLogger.info).toHaveBeenCalledWith('[test-generator] Test info message');
    });

    it('should log error messages with prefix', () => {
      (generator as any).logError('Test error message');
      expect(mockLogger.error).toHaveBeenCalledWith('[test-generator] Test error message');
    });

    it('should log verbose messages with prefix', () => {
      (generator as any).logVerbose('Test verbose message');
      expect(mockLogger.verbose).toHaveBeenCalledWith('[test-generator] Test verbose message');
    });

    it('should log warning messages with prefix', () => {
      (generator as any).logWarning('Test warning message');
      expect(mockLogger.warn).toHaveBeenCalledWith('[test-generator] Test warning message');
    });
  });

  describe('utility methods', () => {
    describe('supportsType', () => {
      it('should return true for supported types', () => {
        expect(generator.supportsType('typescript')).toBe(true);
        expect(generator.supportsType('javascript')).toBe(true);
      });

      it('should return false for unsupported types', () => {
        expect(generator.supportsType('python')).toBe(false);
        expect(generator.supportsType('java')).toBe(false);
      });
    });

    describe('getDescription', () => {
      it('should return formatted description', () => {
        const description = generator.getDescription();
        expect(description).toBe('Test Generator - Supports: typescript, javascript');
      });
    });

    describe('mergeWithDefaults', () => {
      it('should merge options with defaults', () => {
        const options: GeneratorOptions = {
          inputSpec: 'openapi.json',
          outputPath: 'output',
        };
        
        const defaults = {
          skipValidateSpec: true,
          dryRun: false,
        };

        const merged = generator.testMergeWithDefaults(options, defaults);

        expect(merged).toEqual({
          skipValidateSpec: true,
          dryRun: false,
          inputSpec: 'openapi.json',
          outputPath: 'output',
        });
      });

      it('should prioritize provided options over defaults', () => {
        const options: GeneratorOptions = {
          inputSpec: 'openapi.json',
          outputPath: 'output',
          skipValidateSpec: false,
        };
        
        const defaults = {
          skipValidateSpec: true,
        };

        const merged = generator.testMergeWithDefaults(options, defaults);

        expect(merged.skipValidateSpec).toBe(false);
      });
    });

    describe('sanitizeOptions', () => {
      it('should remove undefined values', () => {
        const options: GeneratorOptions = {
          inputSpec: 'openapi.json',
          outputPath: 'output',
          configFile: undefined,
          skipValidateSpec: false,
        };

        const sanitized = generator.testSanitizeOptions(options);

        expect(sanitized).toEqual({
          inputSpec: 'openapi.json',
          outputPath: 'output',
          skipValidateSpec: false,
        });
        expect(sanitized.configFile).toBeUndefined();
      });

      it('should remove null values', () => {
        const options: GeneratorOptions = {
          inputSpec: 'openapi.json',
          outputPath: 'output',
          configFile: null,
        } as any;

        const sanitized = generator.testSanitizeOptions(options);

        expect(sanitized.configFile).toBeUndefined();
      });

      it('should keep falsy but valid values', () => {
        const options: GeneratorOptions = {
          inputSpec: 'openapi.json',
          outputPath: 'output',
          skipValidateSpec: false,
          dryRun: false,
        };

        const sanitized = generator.testSanitizeOptions(options);

        expect(sanitized.skipValidateSpec).toBe(false);
        expect(sanitized.dryRun).toBe(false);
      });
    });
  });

  describe('generation workflow', () => {
    it('should generate successfully with valid options', async () => {
      const options: GeneratorOptions = {
        inputSpec: 'openapi.json',
        outputPath: 'output',
      };

      const result = await generator.generate(options, mockContext);

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toEqual(['output/file1.ts', 'output/file2.ts']);
    });

    it('should fail generation with invalid options', async () => {
      const options: GeneratorOptions = {
        inputSpec: '',
        outputPath: 'output',
      };

      await expect(generator.generate(options, mockContext)).rejects.toThrow(GeneratorValidationError);
    });

    it('should handle generation failure gracefully', async () => {
      const options: GeneratorOptions = {
        inputSpec: 'openapi.json',
        outputPath: 'output',
      };

      generator.setFailGeneration(true);

      await expect(generator.generate(options, mockContext)).rejects.toThrow('Generation failed');
    });

    it('should handle custom generation errors', async () => {
      const options: GeneratorOptions = {
        inputSpec: 'openapi.json',
        outputPath: 'output',
      };

      const customError = new GeneratorExecutionError('test-generator', new Error('Custom error'));
      generator.setFailGeneration(true, customError);

      await expect(generator.generate(options, mockContext)).rejects.toBe(customError);
    });
  });
});