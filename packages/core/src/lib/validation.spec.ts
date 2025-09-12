import { 
  OptionsValidator, 
  validateGenerateOptions, 
  validatePluginName
} from './validation';
import { ValidationError, InvalidPathError } from './errors';

describe('Validation', () => {
  describe('OptionsValidator', () => {
    let validator: OptionsValidator;

    beforeEach(() => {
      validator = new OptionsValidator();
    });

    describe('validate', () => {
      it('should pass for valid options with string inputSpec', () => {
        const options = {
          inputSpec: 'api.yaml',
          outputPath: 'src/generated',
        };

        const result = validator.validate(options);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should pass for valid options with object inputSpec', () => {
        const options = {
          inputSpec: { 
            service1: 'api1.yaml',
            service2: 'api2.yaml',
          },
          outputPath: 'src/generated',
        };

        const result = validator.validate(options);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should pass with valid generatorOptions', () => {
        const options = {
          inputSpec: 'api.yaml',
          outputPath: 'src/generated',
          generatorOptions: {
            skipValidation: true,
            apiPackage: 'com.example.api',
          },
        };

        const result = validator.validate(options);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail for non-object options', () => {
        const result = validator.validate('not-an-object');
        
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toContain('Options must be an object');
      });

      it('should fail for null options', () => {
        const result = validator.validate(null);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
      });

      it('should fail for undefined options', () => {
        const result = validator.validate(undefined);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
      });
    });

    describe('inputSpec validation', () => {
      it('should fail for missing inputSpec', () => {
        const options = {
          outputPath: 'src/generated',
        };

        const result = validator.validate(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.field === 'inputSpec')).toBe(true);
      });

      it('should fail for empty string inputSpec', () => {
        const options = {
          inputSpec: '',
          outputPath: 'src/generated',
        };

        const result = validator.validate(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => 
          e.field === 'inputSpec' && e.message.includes('cannot be empty')
        )).toBe(true);
      });

      it('should fail for empty object inputSpec', () => {
        const options = {
          inputSpec: {},
          outputPath: 'src/generated',
        };

        const result = validator.validate(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => 
          e.field === 'inputSpec' && e.message.includes('cannot be empty')
        )).toBe(true);
      });

      it('should fail for invalid inputSpec type', () => {
        const options = {
          inputSpec: 123,
          outputPath: 'src/generated',
        };

        const result = validator.validate(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.field === 'inputSpec')).toBe(true);
      });
    });

    describe('outputPath validation', () => {
      it('should fail for missing outputPath', () => {
        const options = {
          inputSpec: 'api.yaml',
        };

        const result = validator.validate(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => 
          e.field === 'outputPath' && e.message.includes('required')
        )).toBe(true);
      });

      it('should fail for empty outputPath', () => {
        const options = {
          inputSpec: 'api.yaml',
          outputPath: '',
        };

        const result = validator.validate(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => 
          e.field === 'outputPath' && e.message.includes('cannot be empty')
        )).toBe(true);
      });

      it('should fail for non-string outputPath', () => {
        const options = {
          inputSpec: 'api.yaml',
          outputPath: 123,
        };

        const result = validator.validate(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => 
          e.field === 'outputPath' && e.message.includes('must be a string')
        )).toBe(true);
      });

      it('should fail for dangerous paths', () => {
        const dangerousPaths = ['/', '..', '../outside', '/etc/passwd', '~/home'];
        
        for (const path of dangerousPaths) {
          const options = {
            inputSpec: 'api.yaml',
            outputPath: path,
          };

          const result = validator.validate(options);
          
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e instanceof InvalidPathError)).toBe(true);
        }
      });
    });

    describe('generatorOptions validation', () => {
      it('should pass for undefined generatorOptions', () => {
        const options = {
          inputSpec: 'api.yaml',
          outputPath: 'src/generated',
        };

        const result = validator.validate(options);
        
        expect(result.valid).toBe(true);
      });

      it('should fail for null generatorOptions', () => {
        const options = {
          inputSpec: 'api.yaml',
          outputPath: 'src/generated',
          generatorOptions: null,
        };

        const result = validator.validate(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => 
          e.field === 'generatorOptions' && e.message.includes('cannot be null')
        )).toBe(true);
      });

      it('should fail for array generatorOptions', () => {
        const options = {
          inputSpec: 'api.yaml',
          outputPath: 'src/generated',
          generatorOptions: [],
        };

        const result = validator.validate(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => 
          e.field === 'generatorOptions' && e.message.includes('cannot be an array')
        )).toBe(true);
      });

      it('should fail for non-object generatorOptions', () => {
        const options = {
          inputSpec: 'api.yaml',
          outputPath: 'src/generated',
          generatorOptions: 'not-an-object',
        };

        const result = validator.validate(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => 
          e.field === 'generatorOptions' && e.message.includes('must be an object')
        )).toBe(true);
      });
    });

    describe('multiple errors', () => {
      it('should collect all validation errors', () => {
        const options = {
          inputSpec: '',
          outputPath: 123,
          generatorOptions: [],
        };

        const result = validator.validate(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('validateGenerateOptions', () => {
    it('should not throw for valid options', () => {
      const options = {
        inputSpec: 'api.yaml',
        outputPath: 'src/generated',
      };

      expect(() => validateGenerateOptions(options)).not.toThrow();
    });

    it('should throw ValidationError for invalid options', () => {
      const options = {
        inputSpec: '',
        outputPath: 'src/generated',
      };

      expect(() => validateGenerateOptions(options)).toThrow(ValidationError);
    });

    it('should throw the first error when multiple errors exist', () => {
      const options = {};

      try {
        validateGenerateOptions(options);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
      }
    });
  });

  describe('validatePluginName', () => {
    it('should not throw for valid plugin names', () => {
      const validNames = [
        'my-plugin',
        '@scope/plugin',
        'plugin_name',
        'plugin.name',
        'Plugin123',
      ];

      for (const name of validNames) {
        expect(() => validatePluginName(name)).not.toThrow();
      }
    });

    it('should throw for non-string values', () => {
      expect(() => validatePluginName(null)).toThrow(ValidationError);
      expect(() => validatePluginName(undefined)).toThrow(ValidationError);
      expect(() => validatePluginName(123)).toThrow(ValidationError);
      expect(() => validatePluginName({})).toThrow(ValidationError);
    });

    it('should throw for empty string', () => {
      expect(() => validatePluginName('')).toThrow(ValidationError);
      expect(() => validatePluginName('   ')).toThrow(ValidationError);
    });

    it('should throw for names with invalid characters', () => {
      const invalidNames = [
        'plugin<name>',
        'plugin:name',
        'plugin"name',
        'plugin|name',
        'plugin?name',
        'plugin*name',
      ];

      for (const name of invalidNames) {
        expect(() => validatePluginName(name)).toThrow(ValidationError);
      }
    });
  });
});