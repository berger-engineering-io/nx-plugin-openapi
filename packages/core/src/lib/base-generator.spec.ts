import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { BaseGenerator } from './base-generator';
import { GeneratorContext } from './interfaces';

// Mock node:fs module
jest.mock('node:fs', () => ({
  rmSync: jest.fn(),
}));

// Create a concrete implementation for testing
class TestGenerator extends BaseGenerator {
  // Expose protected method for testing
  public testCleanOutput(ctx: GeneratorContext, relOutputPath: string) {
    this.cleanOutput(ctx, relOutputPath);
  }

  public testResolveOutputPath(ctx: GeneratorContext, outputPath: string) {
    return this.resolveOutputPath(ctx, outputPath);
  }

  public testResolveInputSpecPath(ctx: GeneratorContext, spec: string) {
    return this.resolveInputSpecPath(ctx, spec);
  }

  public testIsUrl(spec: string) {
    return this.isUrl(spec);
  }
}

describe('BaseGenerator', () => {
  let generator: TestGenerator;
  let mockContext: GeneratorContext;

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new TestGenerator();
    mockContext = {
      root: '/workspace',
      workspaceName: 'test-workspace',
    };
  });

  describe('cleanOutput', () => {
    it('should remove directory with correct path', () => {
      const relOutputPath = 'dist/generated';

      generator.testCleanOutput(mockContext, relOutputPath);

      expect(rmSync).toHaveBeenCalledWith('/workspace/dist/generated', {
        recursive: true,
        force: true,
      });
    });

    it('should handle absolute paths correctly', () => {
      const relOutputPath = 'apps/demo/src/generated';

      generator.testCleanOutput(mockContext, relOutputPath);

      expect(rmSync).toHaveBeenCalledWith(
        '/workspace/apps/demo/src/generated',
        { recursive: true, force: true }
      );
    });

    it('should handle paths with dots', () => {
      const relOutputPath = './output/api';

      generator.testCleanOutput(mockContext, relOutputPath);

      // join normalizes paths, so ./output/api becomes output/api
      expect(rmSync).toHaveBeenCalledWith('/workspace/output/api', {
        recursive: true,
        force: true,
      });
    });

    it('should handle valid nested paths', () => {
      const relOutputPath = 'src/generated/api';

      generator.testCleanOutput(mockContext, relOutputPath);

      expect(rmSync).toHaveBeenCalledWith('/workspace/src/generated/api', {
        recursive: true,
        force: true,
      });
    });

    it('should use join to construct paths correctly', () => {
      const relOutputPath = 'some/nested/path';
      const expectedPath = join(mockContext.root, relOutputPath);

      generator.testCleanOutput(mockContext, relOutputPath);

      expect(rmSync).toHaveBeenCalledWith(expectedPath, {
        recursive: true,
        force: true,
      });
    });

    it('should handle Windows-style paths', () => {
      const mockWindowsContext = {
        ...mockContext,
        root: 'C:\\workspace',
      };
      const relOutputPath = 'dist\\generated';

      generator.testCleanOutput(mockWindowsContext, relOutputPath);

      expect(rmSync).toHaveBeenCalledWith(
        expect.stringContaining('workspace'),
        { recursive: true, force: true }
      );
    });

    it('should always use recursive and force options', () => {
      const relOutputPath = 'any/path';

      generator.testCleanOutput(mockContext, relOutputPath);

      expect(rmSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          recursive: true,
          force: true,
        })
      );
    });

    it('should throw error for empty path', () => {
      const relOutputPath = '';

      expect(() => {
        generator.testCleanOutput(mockContext, relOutputPath);
      }).toThrow('Cannot clean empty or root output path for safety reasons');

      expect(rmSync).not.toHaveBeenCalled();
    });

    it('should throw error for whitespace-only path', () => {
      const relOutputPath = '   ';

      expect(() => {
        generator.testCleanOutput(mockContext, relOutputPath);
      }).toThrow('Cannot clean empty or root output path for safety reasons');

      expect(rmSync).not.toHaveBeenCalled();
    });

    it('should throw error for root path', () => {
      const relOutputPath = '/';

      expect(() => {
        generator.testCleanOutput(mockContext, relOutputPath);
      }).toThrow('Cannot clean empty or root output path for safety reasons');

      expect(rmSync).not.toHaveBeenCalled();
    });

    it('should throw error for current directory path', () => {
      const relOutputPath = '.';

      expect(() => {
        generator.testCleanOutput(mockContext, relOutputPath);
      }).toThrow('Cannot clean empty or root output path for safety reasons');

      expect(rmSync).not.toHaveBeenCalled();
    });

    it('should remove absolute output path as-is', () => {
      generator.testCleanOutput(mockContext, '/tmp/generated');

      expect(rmSync).toHaveBeenCalledWith('/tmp/generated', {
        recursive: true,
        force: true,
      });
    });

    it('should refuse to clean path resolving to workspace root', () => {
      expect(() => {
        generator.testCleanOutput(mockContext, './');
      }).toThrow('Cannot clean empty or root output path for safety reasons');
      expect(() => {
        generator.testCleanOutput(mockContext, 'foo/..');
      }).toThrow('Cannot clean empty or root output path for safety reasons');
      expect(() => {
        generator.testCleanOutput(mockContext, '/workspace');
      }).toThrow('Cannot clean empty or root output path for safety reasons');

      expect(rmSync).not.toHaveBeenCalled();
    });

    it('should refuse to clean filesystem root via relative traversal', () => {
      expect(() => {
        generator.testCleanOutput(mockContext, '../');
      }).toThrow('Cannot clean empty or root output path for safety reasons');

      expect(rmSync).not.toHaveBeenCalled();
    });
  });

  describe('resolveOutputPath', () => {
    it('should join relative path with workspace root', () => {
      expect(generator.testResolveOutputPath(mockContext, 'libs/api/src')).toBe(
        '/workspace/libs/api/src'
      );
    });

    it('should keep absolute path untouched', () => {
      expect(generator.testResolveOutputPath(mockContext, '/abs/out')).toBe(
        '/abs/out'
      );
    });
  });

  describe('resolveInputSpecPath', () => {
    it('should resolve relative spec against workspace root', () => {
      expect(
        generator.testResolveInputSpecPath(mockContext, 'specs/petstore.json')
      ).toBe('/workspace/specs/petstore.json');
    });

    it('should keep absolute spec path untouched', () => {
      expect(
        generator.testResolveInputSpecPath(mockContext, '/abs/specs/api.yaml')
      ).toBe('/abs/specs/api.yaml');
    });

    it.each([
      'https://petstore3.swagger.io/api/v3/openapi.json',
      'http://localhost:8080/openapi.yaml',
      'file:///tmp/api.yaml',
    ])('should keep URL %s untouched', (url) => {
      expect(generator.testResolveInputSpecPath(mockContext, url)).toBe(url);
    });
  });

  describe('isUrl', () => {
    it('should not treat Windows drive paths as URLs', () => {
      expect(generator.testIsUrl('C:\\specs\\api.yaml')).toBe(false);
      expect(generator.testIsUrl('C:/specs/api.yaml')).toBe(false);
    });

    it('should not treat registry-like shorthand as URL', () => {
      expect(generator.testIsUrl('specs/petstore.json')).toBe(false);
    });
  });
});
