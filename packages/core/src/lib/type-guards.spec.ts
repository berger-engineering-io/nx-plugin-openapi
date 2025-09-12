import { 
  isGeneratorPlugin, 
  isValidInputSpec, 
  isValidGenerateOptions,
  assertValidPath 
} from './type-guards';
import { GeneratorPlugin, GenerateOptionsBase } from './interfaces';

describe('Type Guards', () => {
  describe('isGeneratorPlugin', () => {
    it('should return true for valid plugin', () => {
      const plugin: GeneratorPlugin = {
        name: 'test-plugin',
        generate: jest.fn(),
      };
      
      expect(isGeneratorPlugin(plugin)).toBe(true);
    });

    it('should return true for plugin with optional methods', () => {
      const plugin: GeneratorPlugin = {
        name: 'test-plugin',
        generate: jest.fn(),
        validate: jest.fn(),
        getSchema: jest.fn(),
      };
      
      expect(isGeneratorPlugin(plugin)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isGeneratorPlugin(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isGeneratorPlugin(undefined)).toBe(false);
    });

    it('should return false for object without name', () => {
      const obj = { generate: jest.fn() };
      expect(isGeneratorPlugin(obj)).toBe(false);
    });

    it('should return false for object without generate', () => {
      const obj = { name: 'test' };
      expect(isGeneratorPlugin(obj)).toBe(false);
    });

    it('should return false for object with non-string name', () => {
      const obj = { name: 123, generate: jest.fn() };
      expect(isGeneratorPlugin(obj)).toBe(false);
    });

    it('should return false for object with non-function generate', () => {
      const obj = { name: 'test', generate: 'not-a-function' };
      expect(isGeneratorPlugin(obj)).toBe(false);
    });
  });

  describe('isValidInputSpec', () => {
    it('should return true for non-empty string', () => {
      expect(isValidInputSpec('api.yaml')).toBe(true);
      expect(isValidInputSpec('/path/to/spec.json')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isValidInputSpec('')).toBe(false);
    });

    it('should return true for valid object spec', () => {
      const spec = {
        service1: 'path/to/spec1.yaml',
        service2: 'path/to/spec2.json',
      };
      expect(isValidInputSpec(spec)).toBe(true);
    });

    it('should return false for empty object', () => {
      expect(isValidInputSpec({})).toBe(false);
    });

    it('should return false for object with empty string values', () => {
      const spec = {
        service1: '',
        service2: 'valid',
      };
      expect(isValidInputSpec(spec)).toBe(false);
    });

    it('should return false for object with empty string keys', () => {
      const spec = {
        '': 'path/to/spec.yaml',
      };
      expect(isValidInputSpec(spec)).toBe(false);
    });

    it('should return false for array', () => {
      expect(isValidInputSpec(['spec1', 'spec2'])).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidInputSpec(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidInputSpec(undefined)).toBe(false);
    });

    it('should return false for number', () => {
      expect(isValidInputSpec(123)).toBe(false);
    });
  });

  describe('isValidGenerateOptions', () => {
    it('should return true for valid options with string inputSpec', () => {
      const options: GenerateOptionsBase = {
        inputSpec: 'api.yaml',
        outputPath: 'src/generated',
      };
      expect(isValidGenerateOptions(options)).toBe(true);
    });

    it('should return true for valid options with object inputSpec', () => {
      const options: GenerateOptionsBase = {
        inputSpec: { service: 'api.yaml' },
        outputPath: 'src/generated',
      };
      expect(isValidGenerateOptions(options)).toBe(true);
    });

    it('should return true for options with generatorOptions', () => {
      const options: GenerateOptionsBase = {
        inputSpec: 'api.yaml',
        outputPath: 'src/generated',
        generatorOptions: { skipValidation: true },
      };
      expect(isValidGenerateOptions(options)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValidGenerateOptions(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidGenerateOptions(undefined)).toBe(false);
    });

    it('should return false for missing inputSpec', () => {
      const options = {
        outputPath: 'src/generated',
      };
      expect(isValidGenerateOptions(options)).toBe(false);
    });

    it('should return false for missing outputPath', () => {
      const options = {
        inputSpec: 'api.yaml',
      };
      expect(isValidGenerateOptions(options)).toBe(false);
    });

    it('should return false for invalid inputSpec', () => {
      const options = {
        inputSpec: '',
        outputPath: 'src/generated',
      };
      expect(isValidGenerateOptions(options)).toBe(false);
    });

    it('should return false for empty outputPath', () => {
      const options = {
        inputSpec: 'api.yaml',
        outputPath: '',
      };
      expect(isValidGenerateOptions(options)).toBe(false);
    });

    it('should return false for array generatorOptions', () => {
      const options = {
        inputSpec: 'api.yaml',
        outputPath: 'src/generated',
        generatorOptions: [],
      };
      expect(isValidGenerateOptions(options)).toBe(false);
    });
  });

  describe('assertValidPath', () => {
    it('should not throw for valid relative paths', () => {
      expect(() => assertValidPath('src/generated', 'outputPath')).not.toThrow();
      expect(() => assertValidPath('dist/api', 'outputPath')).not.toThrow();
      expect(() => assertValidPath('generated', 'outputPath')).not.toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => assertValidPath('', 'outputPath')).toThrow('outputPath must be a non-empty string');
    });

    it('should throw for whitespace-only string', () => {
      expect(() => assertValidPath('   ', 'outputPath')).toThrow('outputPath cannot be empty');
    });

    it('should throw for root path', () => {
      expect(() => assertValidPath('/', 'outputPath')).toThrow('outputPath cannot be a root or parent directory reference');
    });

    it('should throw for current directory', () => {
      expect(() => assertValidPath('.', 'outputPath')).toThrow('outputPath cannot be a root or parent directory reference');
    });

    it('should throw for parent directory', () => {
      expect(() => assertValidPath('..', 'outputPath')).toThrow('outputPath cannot be a root or parent directory reference');
    });

    it('should throw for paths with parent directory references', () => {
      expect(() => assertValidPath('../outside', 'outputPath')).toThrow('outputPath contains potentially dangerous path pattern');
      expect(() => assertValidPath('src/../outside', 'outputPath')).toThrow('outputPath contains potentially dangerous path pattern');
    });

    it('should throw for absolute paths', () => {
      expect(() => assertValidPath('/etc/passwd', 'outputPath')).toThrow('outputPath contains potentially dangerous path pattern');
    });

    it('should throw for home directory references', () => {
      expect(() => assertValidPath('~/Documents', 'outputPath')).toThrow('outputPath contains potentially dangerous path pattern');
    });

    it('should throw for non-string values', () => {
      expect(() => assertValidPath(null as never, 'outputPath')).toThrow('outputPath must be a non-empty string');
      expect(() => assertValidPath(undefined as never, 'outputPath')).toThrow('outputPath must be a non-empty string');
      expect(() => assertValidPath(123 as never, 'outputPath')).toThrow('outputPath must be a non-empty string');
    });
  });
});