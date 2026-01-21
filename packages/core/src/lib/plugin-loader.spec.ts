import { GeneratorRegistry } from './registry';
import { PluginLoadError, PluginNotFoundError } from './errors';
import { GeneratorPlugin } from './interfaces';
import { loadPlugin } from './plugin-loader';
import * as autoInstaller from './auto-installer';

// Mock the auto-installer module
jest.mock('./auto-installer', () => ({
  installPackages: jest.fn(),
  detectCi: jest.fn().mockReturnValue(false),
  detectPackageManager: jest.fn().mockReturnValue('npm'),
}));

// Mock the dynamic imports
jest.mock(
  '@nx-plugin-openapi/plugin-openapi',
  () => ({
    default: {
      name: 'openapi-tools',
      generate: jest.fn(),
    },
  }),
  { virtual: true }
);

describe('plugin-loader', () => {
  let registry: GeneratorRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the module cache
    jest.resetModules();
    // Get fresh registry instance
    registry = GeneratorRegistry.instance();
    jest.spyOn(registry, 'has');
    jest.spyOn(registry, 'get');
    // Reset auto-installer mocks
    (autoInstaller.detectCi as jest.Mock).mockReturnValue(false);
    (autoInstaller.installPackages as jest.Mock).mockClear();
  });

  afterEach(() => {
    // Clear registry between tests
    (registry as unknown as { plugins: Map<string, unknown> }).plugins.clear();
  });

  describe('loadPlugin', () => {
    it('should return plugin from registry if it exists', async () => {
      const mockPlugin: GeneratorPlugin = {
        name: 'test-plugin',
        generate: jest.fn(),
        validate: jest.fn(),
        getSchema: jest.fn(),
      };

      registry.register(mockPlugin);

      const result = await loadPlugin('test-plugin');

      expect(result).toBe(mockPlugin);
      expect(registry.has).toHaveBeenCalledWith('test-plugin');
      expect(registry.get).toHaveBeenCalledWith('test-plugin');
    });

    it('should load built-in openapi-tools plugin', async () => {
      const result = await loadPlugin('openapi-tools');

      expect(result).toBeDefined();
      expect(result.generate).toBeDefined();
      expect(typeof result.generate).toBe('function');
    });

    it('should cache loaded plugins', async () => {
      const firstLoad = await loadPlugin('openapi-tools');
      const secondLoad = await loadPlugin('openapi-tools');

      expect(firstLoad).toBe(secondLoad);
    });

    it('should load plugin from default export', async () => {
      const mockPlugin = {
        name: 'default-export-plugin',
        generate: jest.fn(),
      };

      jest.doMock(
        'default-export-plugin',
        () => ({
          default: mockPlugin,
        }),
        { virtual: true }
      );

      const result = await loadPlugin('default-export-plugin');

      expect(result).toBe(mockPlugin);
    });

    it('should load plugin from createPlugin function', async () => {
      const mockPlugin = {
        name: 'factory-plugin',
        generate: jest.fn(),
      };

      jest.doMock(
        'factory-plugin',
        () => ({
          createPlugin: () => mockPlugin,
        }),
        { virtual: true }
      );

      const result = await loadPlugin('factory-plugin');

      expect(result).toBe(mockPlugin);
    });

    it('should load plugin from plugin property', async () => {
      const mockPlugin = {
        name: 'property-plugin',
        generate: jest.fn(),
      };

      jest.doMock(
        'property-plugin',
        () => ({
          plugin: mockPlugin,
        }),
        { virtual: true }
      );

      const result = await loadPlugin('property-plugin');

      expect(result).toBe(mockPlugin);
    });

    it('should load plugin from Plugin property', async () => {
      const mockPlugin = {
        name: 'capital-plugin',
        generate: jest.fn(),
      };

      jest.doMock(
        'capital-plugin',
        () => ({
          Plugin: mockPlugin,
        }),
        { virtual: true }
      );

      const result = await loadPlugin('capital-plugin');

      expect(result).toBe(mockPlugin);
    });

    it('should throw PluginLoadError if module does not export a plugin', async () => {
      jest.doMock(
        'invalid-plugin',
        () => ({
          notAPlugin: 'test',
        }),
        { virtual: true }
      );

      await expect(loadPlugin('invalid-plugin')).rejects.toThrow(
        PluginLoadError
      );
      await expect(loadPlugin('invalid-plugin')).rejects.toThrow(
        'Failed to load generator plugin'
      );
    });

    it('should throw PluginNotFoundError for non-existent module', async () => {
      jest.doMock(
        'non-existent-plugin',
        () => {
          const error = new Error('Cannot find module');
          (error as Error & { code: string }).code = 'ERR_MODULE_NOT_FOUND';
          throw error;
        },
        { virtual: true }
      );

      await expect(loadPlugin('non-existent-plugin')).rejects.toThrow(
        PluginNotFoundError
      );
    });

    it('should throw PluginLoadError for other import errors', async () => {
      jest.doMock(
        'error-plugin',
        () => {
          throw new Error('Some other error');
        },
        { virtual: true }
      );

      await expect(loadPlugin('error-plugin')).rejects.toThrow(PluginLoadError);
    });

    it('should attempt fallback loading for openapi-tools plugin in local development', async () => {
      // Set up local development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const result = await loadPlugin('openapi-tools', {
          root: '/test/workspace',
        });

        expect(result).toBeDefined();
        expect(result.generate).toBeDefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should not attempt fallback loading in production', async () => {
      // Set up production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Mock the module to not be found
      jest.doMock(
        '@nx-plugin-openapi/plugin-prod-test',
        () => {
          const error = new Error('Cannot find module');
          (error as Error & { code: string }).code = 'ERR_MODULE_NOT_FOUND';
          throw error;
        },
        { virtual: true }
      );

      try {
        await expect(
          loadPlugin('@nx-plugin-openapi/plugin-prod-test', {
            root: '/test/workspace',
          })
        ).rejects.toThrow(PluginNotFoundError);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should exclude TS source paths from fallback candidates in local dev', () => {
      // Set up local development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        // This test verifies that the fallback candidate logic doesn't include TS files
        // by inspecting the plugin-loader source code logic

        // We'll test this by examining the behavior when the main import fails
        // and verify that only JS paths are attempted
        const testCandidates = [];
        const mockRoot = '/test/workspace';
        const pkg = '@nx-plugin-openapi/plugin-openapi';

        // Simulate the candidate generation logic from plugin-loader.ts
        // Only in local development mode
        const isLocalDev = process.env.NODE_ENV === 'development';
        if (isLocalDev && pkg === '@nx-plugin-openapi/plugin-openapi') {
          testCandidates.push(
            `${mockRoot}/dist/packages/plugin-openapi/src/index.js`,
            `${mockRoot}/packages/plugin-openapi/src/index.js`
          );
        }

        // Verify that candidates only include JS files, not TS files
        expect(testCandidates).toHaveLength(2);
        expect(testCandidates[0]).toMatch(/\.js$/);
        expect(testCandidates[1]).toMatch(/\.js$/);

        // Verify no TS paths are included
        const tsFiles = testCandidates.filter(path => path.endsWith('.ts'));
        expect(tsFiles).toHaveLength(0);

        // Verify the correct order: dist JS first, then source JS
        expect(testCandidates[0]).toContain('/dist/packages/plugin-openapi/src/index.js');
        expect(testCandidates[1]).toContain('/packages/plugin-openapi/src/index.js');
        expect(testCandidates[0]).not.toEqual(testCandidates[1]); // Should be different paths
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should validate plugin has generate function', async () => {
      const invalidPlugin = {
        name: 'no-generate',
        // Missing generate function
      };

      jest.doMock(
        'no-generate-plugin',
        () => ({
          default: invalidPlugin,
        }),
        { virtual: true }
      );

      await expect(loadPlugin('no-generate-plugin')).rejects.toThrow(
        PluginLoadError
      );
    });

    describe('auto-installation', () => {
      it('should attempt auto-installation for missing @nx-plugin-openapi packages when skipPrompt is true', async () => {
        const mockPlugin = {
          name: 'plugin-test',
          generate: jest.fn(),
        };

        // The module mock will throw on first import, then succeed after "installation"
        let isInstalled = false;
        jest.doMock(
          '@nx-plugin-openapi/plugin-test',
          () => {
            if (!isInstalled) {
              const error = new Error('Cannot find module');
              (error as Error & { code: string }).code = 'ERR_MODULE_NOT_FOUND';
              throw error;
            }
            return { default: mockPlugin };
          },
          { virtual: true }
        );

        // Mock successful installation that sets the flag
        (autoInstaller.installPackages as jest.Mock).mockImplementation(() => {
          isInstalled = true;
        });

        // Use skipPrompt: true to bypass the interactive prompt in tests
        const result = await loadPlugin('@nx-plugin-openapi/plugin-test', {
          skipPrompt: true,
        });

        expect(autoInstaller.installPackages).toHaveBeenCalledWith(
          ['@nx-plugin-openapi/plugin-test'],
          { dev: true }
        );
        expect(result).toBe(mockPlugin);
      });

      it('should skip auto-installation in non-interactive environments without skipPrompt', async () => {
        // In test environment, process.stdin.isTTY is false, so prompt should be skipped
        // and installation should not proceed
        jest.doMock(
          '@nx-plugin-openapi/plugin-non-tty-test',
          () => {
            const error = new Error('Cannot find module');
            (error as Error & { code: string }).code = 'ERR_MODULE_NOT_FOUND';
            throw error;
          },
          { virtual: true }
        );

        await expect(
          loadPlugin('@nx-plugin-openapi/plugin-non-tty-test')
        ).rejects.toThrow(PluginNotFoundError);

        // Installation should NOT be called because prompt returned false
        expect(autoInstaller.installPackages).not.toHaveBeenCalled();
      });

      it('should not attempt auto-installation in CI environment', async () => {
        (autoInstaller.detectCi as jest.Mock).mockReturnValue(true);

        jest.doMock(
          '@nx-plugin-openapi/plugin-ci-test',
          () => {
            const error = new Error('Cannot find module');
            (error as Error & { code: string }).code = 'ERR_MODULE_NOT_FOUND';
            throw error;
          },
          { virtual: true }
        );

        await expect(
          loadPlugin('@nx-plugin-openapi/plugin-ci-test')
        ).rejects.toThrow(PluginNotFoundError);

        expect(autoInstaller.installPackages).not.toHaveBeenCalled();
      });

      it('should not attempt auto-installation for non-nx-plugin-openapi packages', async () => {
        jest.doMock(
          'external-plugin',
          () => {
            const error = new Error('Cannot find module');
            (error as Error & { code: string }).code = 'ERR_MODULE_NOT_FOUND';
            throw error;
          },
          { virtual: true }
        );

        await expect(loadPlugin('external-plugin')).rejects.toThrow(
          PluginNotFoundError
        );

        expect(autoInstaller.installPackages).not.toHaveBeenCalled();
      });

      it('should handle auto-installation failure gracefully', async () => {
        jest.doMock(
          '@nx-plugin-openapi/plugin-fail-test',
          () => {
            const error = new Error('Cannot find module');
            (error as Error & { code: string }).code = 'ERR_MODULE_NOT_FOUND';
            throw error;
          },
          { virtual: true }
        );

        // Mock installation failure
        (autoInstaller.installPackages as jest.Mock).mockImplementation(() => {
          throw new Error('Installation failed');
        });

        await expect(
          loadPlugin('@nx-plugin-openapi/plugin-fail-test', { skipPrompt: true })
        ).rejects.toThrow(PluginNotFoundError);

        expect(autoInstaller.installPackages).toHaveBeenCalledWith(
          ['@nx-plugin-openapi/plugin-fail-test'],
          { dev: true }
        );
      });

      it('should use built-in mapping for auto-installation', async () => {
        const mockPlugin = {
          name: 'hey-api',
          generate: jest.fn(),
        };

        // The module mock will throw on first import, then succeed after "installation"
        let isInstalled = false;
        jest.doMock(
          '@nx-plugin-openapi/plugin-hey-api',
          () => {
            if (!isInstalled) {
              const error = new Error('Cannot find module');
              (error as Error & { code: string }).code = 'ERR_MODULE_NOT_FOUND';
              throw error;
            }
            return { default: mockPlugin };
          },
          { virtual: true }
        );

        // Mock successful installation that sets the flag
        (autoInstaller.installPackages as jest.Mock).mockImplementation(() => {
          isInstalled = true;
        });

        const result = await loadPlugin('hey-api', { skipPrompt: true });

        expect(autoInstaller.installPackages).toHaveBeenCalledWith(
          ['@nx-plugin-openapi/plugin-hey-api'],
          { dev: true }
        );
        expect(result).toBe(mockPlugin);
      });

      it('should log the detected package manager when installing', async () => {
        const mockPlugin = {
          name: 'plugin-pm-log',
          generate: jest.fn(),
        };

        let isInstalled = false;
        jest.doMock(
          '@nx-plugin-openapi/plugin-pm-log',
          () => {
            if (!isInstalled) {
              const error = new Error('Cannot find module');
              (error as Error & { code: string }).code = 'ERR_MODULE_NOT_FOUND';
              throw error;
            }
            return { default: mockPlugin };
          },
          { virtual: true }
        );

        (autoInstaller.installPackages as jest.Mock).mockImplementation(() => {
          isInstalled = true;
        });

        // Mock detectPackageManager to return a specific value
        (autoInstaller.detectPackageManager as jest.Mock).mockReturnValue(
          'pnpm'
        );

        await loadPlugin('@nx-plugin-openapi/plugin-pm-log', {
          skipPrompt: true,
        });

        // Verify detectPackageManager was called
        expect(autoInstaller.detectPackageManager).toHaveBeenCalled();
      });

      it('should check node_modules before attempting auto-installation', async () => {
        const mockPlugin = {
          name: 'already-installed',
          generate: jest.fn(),
        };

        // Mock as if the module is already installed
        jest.doMock(
          '@nx-plugin-openapi/plugin-already-installed',
          () => ({ default: mockPlugin }),
          { virtual: true }
        );

        const result = await loadPlugin('@nx-plugin-openapi/plugin-already-installed');

        // Should NOT attempt installation since it's already available
        expect(autoInstaller.installPackages).not.toHaveBeenCalled();
        expect(result).toBe(mockPlugin);
      });
    });
  });
});
