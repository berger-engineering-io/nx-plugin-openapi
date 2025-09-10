/**
 * Unit tests for OpenAPI Tools Generator Plugin
 */

import { OpenApiToolsGenerator, createOpenApiToolsGenerator } from './openapi-tools-generator';
import { GeneratorContext } from '@nx-plugin-openapi/core';

describe('OpenApiToolsGenerator', () => {
  let generator: OpenApiToolsGenerator;
  let mockContext: GeneratorContext;

  beforeEach(() => {
    generator = new OpenApiToolsGenerator();
    mockContext = {
      workspaceRoot: '/mock/workspace',
      projectName: 'test-project',
      projectRoot: 'apps/test-project',
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
    };
  });

  describe('plugin metadata', () => {
    it('should have correct plugin metadata', () => {
      expect(generator.name).toBe('openapi-tools');
      expect(generator.version).toBe('1.0.0');
      expect(generator.description).toBeDefined();
      expect(generator.supportedFileTypes).toEqual(['yaml', 'yml', 'json']);
      expect(generator.requiredOptions).toEqual(['inputSpec', 'outputPath']);
    });
  });

  describe('getSchema', () => {
    it('should return a valid JSON schema', async () => {
      const schema = await generator.getSchema();

      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.required).toEqual(['inputSpec', 'outputPath']);
      expect(schema.properties['inputSpec']).toBeDefined();
      expect(schema.properties['outputPath']).toBeDefined();
    });

    it('should include all expected properties in schema', async () => {
      const schema = await generator.getSchema();
      const properties = schema.properties;

      // Check for key properties
      expect(properties['inputSpec']).toBeDefined();
      expect(properties['outputPath']).toBeDefined();
      expect(properties['generator']).toBeDefined();
      expect(properties['configFile']).toBeDefined();
      expect(properties['skipValidateSpec']).toBeDefined();
      expect(properties['globalProperties']).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should pass validation with valid options', async () => {
      const options = {
        inputSpec: '/path/to/spec.yaml',
        outputPath: './generated',
      };

      const result = await generator.validate(options);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when required options are missing', async () => {
      const options = {
        // Missing required inputSpec and outputPath
      };

      const result = await generator.validate(options);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      const errorMessages = result.errors.map(e => e.message);
      expect(errorMessages.some(msg => msg.includes('inputSpec'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('outputPath'))).toBe(true);
    });

    it('should fail validation with invalid inputSpec format', async () => {
      const options = {
        inputSpec: 123, // Invalid type
        outputPath: './generated',
      };

      const result = await generator.validate(options);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should pass validation with multiple specs object', async () => {
      const options = {
        inputSpec: {
          'service1': '/path/to/spec1.yaml',
          'service2': '/path/to/spec2.yaml',
        },
        outputPath: './generated',
      };

      const result = await generator.validate(options);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate globalProperties format', async () => {
      const options = {
        inputSpec: '/path/to/spec.yaml',
        outputPath: './generated',
        globalProperties: {
          'npmName': 'my-client',
          'npmVersion': '1.0.0',
        },
      };

      const result = await generator.validate(options);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('factory function', () => {
    it('should create a new instance', () => {
      const instance = createOpenApiToolsGenerator();
      
      expect(instance).toBeInstanceOf(OpenApiToolsGenerator);
      expect(instance.name).toBe('openapi-tools');
    });
  });

  describe('generate method', () => {
    // Note: These tests would require mocking the child_process.spawn function
    // and file system operations. For now, we're testing the validation logic.
    
    it('should validate options before generation', async () => {
      const options = {
        // Missing required options
      };

      const result = await generator.generate(options, mockContext);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('command building', () => {
    it('should build command args correctly', () => {
      // This would test the private buildCommandArgs method
      // We'd need to either make it public for testing or test it indirectly
      // through the generate method with mocked spawn
    });
  });
});