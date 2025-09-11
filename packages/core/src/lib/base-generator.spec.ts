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

    it('should handle root directory paths', () => {
      const relOutputPath = '/';

      generator.testCleanOutput(mockContext, relOutputPath);

      expect(rmSync).toHaveBeenCalledWith('/workspace/', {
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

    it('should handle empty path', () => {
      const relOutputPath = '';

      generator.testCleanOutput(mockContext, relOutputPath);

      expect(rmSync).toHaveBeenCalledWith('/workspace', {
        recursive: true,
        force: true,
      });
    });
  });
});
