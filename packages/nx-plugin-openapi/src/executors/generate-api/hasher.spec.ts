import { HasherContext, TaskHasher, Task, ProjectGraph, logger } from '@nx/devkit';
import { existsSync, readFileSync } from 'fs';
import { correctgenerateApiHasher } from './hasher';

// Mock external dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('@nx/devkit', () => ({
  logger: {
    verbose: jest.fn(),
    error: jest.fn(),
  },
  workspaceRoot: '/test/workspace',
  hashArray: jest.fn((arr: string[]) => arr.join('-')),
}));

jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn(),
    digest: jest.fn(() => 'mocked-hash'),
  })),
}));

jest.mock('../../generators/utils/log', () => ({
  log: jest.fn((message: string) => `[test] ${message}`),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('generateApiHasher', () => {
  const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
  const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockFetch = global.fetch as jest.Mock;

  const createMockTask = (overrides?: Partial<Task>): Task => ({
    id: 'test-task-id',
    target: {
      project: 'test-project',
      target: 'generate-api',
      configuration: undefined,
    },
    overrides: {},
    outputs: [],
    parallelism: true,
    ...overrides,
  });

  const createMockContext = (options: Record<string, unknown> = {}): HasherContext => {
    const mockHasher: TaskHasher = {
      hashTask: jest.fn().mockResolvedValue({
        value: 'base-hash',
        details: {
          command: 'test-command',
          nodes: {},
          implicitDeps: {},
          runtime: {},
        },
      }),
    } as unknown as TaskHasher;

    return {
      hasher: mockHasher,
      projectsConfigurations: {
        version: 2,
        projects: {
          'test-project': {
            root: 'apps/test-project',
            targets: {
              'generate-api': {
                executor: '@lambda-solutions/nx-plugin-openapi:generate-api',
                options: {
                  inputSpec: 'swagger.json',
                  outputPath: 'libs/api',
                  ...options,
                },
              },
            },
          },
        },
      },
      taskGraph: {
        tasks: {},
        dependencies: {},
        roots: [],
      } as unknown as ProjectGraph,
    } as unknown as HasherContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('local file hashing', () => {
    it('should hash local file when inputSpec is a file path', async () => {
      const task = createMockTask();
      const context = createMockContext();
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('openapi content');

      const result = await correctgenerateApiHasher(task, context);

      expect(mockExistsSync).toHaveBeenCalledWith('/test/workspace/swagger.json');
      expect(mockReadFileSync).toHaveBeenCalledWith('/test/workspace/swagger.json', { encoding: 'utf8' });
      expect(result).toEqual({
        value: 'base-hash-/test/workspace/swagger.json-mocked-hash',
        details: {
          command: 'test-command',
          nodes: {},
          implicitDeps: {},
          runtime: {},
        },
      });
      expect(mockLogger.verbose).toHaveBeenCalledWith('[test] Local file detected for inputSpec.');
    });

    it('should handle relative file paths', async () => {
      const task = createMockTask();
      const context = createMockContext({
        inputSpec: './api/openapi.yaml',
        outputPath: 'libs/generated',
      });
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('yaml content');

      const result = await correctgenerateApiHasher(task, context);

      expect(mockExistsSync).toHaveBeenCalledWith('/test/workspace/api/openapi.yaml');
      expect(result.value).toContain('/test/workspace/api/openapi.yaml');
    });

    it('should handle non-existent local files by using default hasher', async () => {
      const task = createMockTask();
      const context = createMockContext();
      
      mockExistsSync.mockReturnValue(false);

      const result = await correctgenerateApiHasher(task, context);

      expect(result).toEqual({
        value: 'base-hash',
        details: {
          command: 'test-command',
          nodes: {},
          implicitDeps: {},
          runtime: {},
        },
      });
    });
  });

  describe('URL hashing', () => {
    it('should hash content from URL when inputSpec is a URL', async () => {
      const task = createMockTask();
      const context = createMockContext({
        inputSpec: 'https://api.example.com/openapi.json',
        outputPath: 'libs/api',
      });
      
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('remote openapi content'),
      });

      const result = await correctgenerateApiHasher(task, context);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/openapi.json');
      expect(result).toEqual({
        value: 'base-hash-https://api.example.com/openapi.json-mocked-hash',
        details: {
          command: 'test-command',
          nodes: {},
          implicitDeps: {},
          runtime: {},
        },
      });
      expect(mockLogger.verbose).toHaveBeenCalledWith('[test] Remote URL detected for inputSpec.');
      expect(mockLogger.verbose).toHaveBeenCalledWith('[test] Fetching remote OpenAPI spec...');
      expect(mockLogger.verbose).toHaveBeenCalledWith('[test] Remote OpenAPI spec fetched successfully. Now hashing the content.');
    });

    it('should handle fetch errors', async () => {
      const task = createMockTask();
      const context = createMockContext({
        inputSpec: 'https://api.example.com/openapi.json',
        outputPath: 'libs/api',
      });
      
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(correctgenerateApiHasher(task, context)).rejects.toThrow(
        'Failed to fetch remote OpenAPI spec: Not Found'
      );
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[test] Failed to fetch remote OpenAPI spec: Not Found'
      );
    });

    it('should handle different URL formats', async () => {
      const task = createMockTask();
      const context = createMockContext({
        inputSpec: 'http://localhost:3000/api/v1/openapi.yaml',
        outputPath: 'libs/api',
      });
      
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('local server content'),
      });

      const result = await correctgenerateApiHasher(task, context);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/openapi.yaml');
      expect(result.value).toContain('http://localhost:3000/api/v1/openapi.yaml');
    });
  });

  describe('error handling', () => {
    it('should throw error when executor options are invalid', async () => {
      const task = createMockTask();
      const context = createMockContext({
        // Missing required fields
        inputSpec: undefined,
        outputPath: undefined,
      });

      await expect(correctgenerateApiHasher(task, context)).rejects.toThrow(
        '[@lambda-solutions/nx-plugin-openapi] Error parsing executor options for task generate-api'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[test] Error parsing executor options for task generate-api'
      );
    });

    it('should handle missing project configuration', async () => {
      const task = createMockTask({
        target: {
          project: 'non-existent-project',
          target: 'generate-api',
          configuration: undefined,
        },
      });
      const context = createMockContext();

      await expect(correctgenerateApiHasher(task, context)).rejects.toThrow();
    });

    it('should handle missing target configuration', async () => {
      const task = createMockTask({
        target: {
          project: 'test-project',
          target: 'non-existent-target',
          configuration: undefined,
        },
      });
      const context = createMockContext();

      await expect(correctgenerateApiHasher(task, context)).rejects.toThrow();
    });
  });

  describe('optional fields handling', () => {
    it('should handle all optional fields', async () => {
      const task = createMockTask();
      const context = createMockContext({
        inputSpec: 'openapi.json',
        outputPath: 'libs/api',
        generatorType: 'typescript-angular',
        configFile: 'config.json',
        skipValidateSpec: true,
        pluginMetadataDir: '.nx-openapi',
      });
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('content');

      const result = await correctgenerateApiHasher(task, context);

      expect(result).toBeDefined();
      expect(result.value).toContain('base-hash');
    });

    it('should handle minimal required fields only', async () => {
      const task = createMockTask();
      const context = createMockContext({
        inputSpec: 'spec.json',
        outputPath: 'output',
      });
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('minimal content');

      const result = await correctgenerateApiHasher(task, context);

      expect(result).toBeDefined();
      expect(result.value).toContain('base-hash');
    });
  });

  describe('hash details preservation', () => {
    it('should preserve hash details from base hasher', async () => {
      const task = createMockTask();
      const context = createMockContext();
      
      const mockHashDetails = {
        command: 'custom-command',
        nodes: { node1: 'value1' },
        implicitDeps: { dep1: 'value1' },
        runtime: { runtime1: 'value1' },
      };
      
      (context.hasher.hashTask as jest.Mock).mockResolvedValue({
        value: 'base-hash',
        details: mockHashDetails,
      });
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('content');

      const result = await correctgenerateApiHasher(task, context);

      expect(result.details).toEqual(mockHashDetails);
    });
  });

  describe('edge cases', () => {
    it('should handle empty file content', async () => {
      const task = createMockTask();
      const context = createMockContext();
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('');

      const result = await correctgenerateApiHasher(task, context);

      expect(result).toBeDefined();
      expect(result.value).toContain('mocked-hash');
    });

    it('should handle very large file content', async () => {
      const task = createMockTask();
      const context = createMockContext();
      
      const largeContent = 'x'.repeat(1024); // 1KB of content
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(largeContent);

      const result = await correctgenerateApiHasher(task, context);

      expect(result).toBeDefined();
      expect(result.value).toContain('mocked-hash');
    });

    it('should handle file paths with special characters', async () => {
      const task = createMockTask();
      const context = createMockContext({
        inputSpec: 'path with spaces/spec (1).json',
        outputPath: 'libs/api',
      });
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('content');

      const result = await correctgenerateApiHasher(task, context);

      expect(mockExistsSync).toHaveBeenCalledWith('/test/workspace/path with spaces/spec (1).json');
      expect(result.value).toContain('/test/workspace/path with spaces/spec (1).json');
    });
  });
});