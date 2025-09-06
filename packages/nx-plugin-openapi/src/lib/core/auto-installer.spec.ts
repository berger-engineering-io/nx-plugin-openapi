import { logger } from '@nx/devkit';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { AutoInstaller, PackageManager, InstallOptions, InstallResult } from './auto-installer';

// Mock external dependencies
jest.mock('@nx/devkit', () => ({
  logger: {
    info: jest.fn(),
    verbose: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn(),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('readline', () => ({
  createInterface: jest.fn(),
}));

// Mock require.resolve
const mockRequireResolve = jest.fn();
const originalRequire = require;
(global as any).require = Object.assign(jest.fn(), {
  resolve: mockRequireResolve,
  cache: {},
});

describe('AutoInstaller', () => {
  let autoInstaller: AutoInstaller;
  let mockReadline: any;

  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
  const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
  const mockJoin = join as jest.MockedFunction<typeof join>;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
  const mockCreateInterface = createInterface as jest.MockedFunction<typeof createInterface>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup path mocks
    mockJoin.mockImplementation((...paths: string[]) => paths.join('/'));

    // Setup readline mock
    mockReadline = {
      question: jest.fn(),
      close: jest.fn(),
    };
    mockCreateInterface.mockReturnValue(mockReadline);

    // Mock environment variables
    delete process.env.CI;
    delete process.env.npm_config_user_agent;

    autoInstaller = new AutoInstaller('/test/workspace');
  });

  afterEach(() => {
    // Restore original require
    (global as any).require = originalRequire;
  });

  describe('constructor', () => {
    it('should use provided cwd', () => {
      const installer = new AutoInstaller('/custom/path');
      expect(installer).toBeDefined();
    });

    it('should use process.cwd() when no cwd provided', () => {
      const installer = new AutoInstaller();
      expect(installer).toBeDefined();
    });
  });

  describe('package manager detection', () => {
    beforeEach(() => {
      // Reset all lock files to not exist by default
      mockExistsSync.mockReturnValue(false);
      // Mock execSync to throw by default (package manager not available)
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });
    });

    it('should detect npm from package-lock.json', () => {
      mockExistsSync.mockImplementation((path: string) => 
        path.includes('package-lock.json')
      );

      const installer = new AutoInstaller('/test/workspace');
      expect(installer.getPackageManager()).toBe('npm');
      expect(mockLogger.verbose).toHaveBeenCalledWith('Detected npm from package-lock.json');
    });

    it('should detect yarn from yarn.lock', () => {
      mockExistsSync.mockImplementation((path: string) => 
        path.includes('yarn.lock')
      );

      const installer = new AutoInstaller('/test/workspace');
      expect(installer.getPackageManager()).toBe('yarn');
      expect(mockLogger.verbose).toHaveBeenCalledWith('Detected yarn from yarn.lock');
    });

    it('should detect pnpm from pnpm-lock.yaml', () => {
      mockExistsSync.mockImplementation((path: string) => 
        path.includes('pnpm-lock.yaml')
      );

      const installer = new AutoInstaller('/test/workspace');
      expect(installer.getPackageManager()).toBe('pnpm');
      expect(mockLogger.verbose).toHaveBeenCalledWith('Detected pnpm from pnpm-lock.yaml');
    });

    it('should detect bun from bun.lockb', () => {
      mockExistsSync.mockImplementation((path: string) => 
        path.includes('bun.lockb')
      );

      const installer = new AutoInstaller('/test/workspace');
      expect(installer.getPackageManager()).toBe('bun');
      expect(mockLogger.verbose).toHaveBeenCalledWith('Detected bun from bun.lockb');
    });

    it('should prioritize lock files over environment variables', () => {
      process.env.npm_config_user_agent = 'yarn/1.22.0';
      mockExistsSync.mockImplementation((path: string) => 
        path.includes('package-lock.json')
      );

      const installer = new AutoInstaller('/test/workspace');
      expect(installer.getPackageManager()).toBe('npm');
    });

    describe('environment variable detection', () => {
      it('should detect yarn from npm_config_user_agent', () => {
        process.env.npm_config_user_agent = 'yarn/1.22.0 npm/? node/v16.14.0';

        const installer = new AutoInstaller('/test/workspace');
        expect(installer.getPackageManager()).toBe('yarn');
      });

      it('should detect pnpm from npm_config_user_agent', () => {
        process.env.npm_config_user_agent = 'pnpm/7.0.0 npm/? node/v16.14.0';

        const installer = new AutoInstaller('/test/workspace');
        expect(installer.getPackageManager()).toBe('pnpm');
      });

      it('should detect bun from npm_config_user_agent', () => {
        process.env.npm_config_user_agent = 'bun/1.0.0 npm/? node/v16.14.0';

        const installer = new AutoInstaller('/test/workspace');
        expect(installer.getPackageManager()).toBe('bun');
      });
    });

    describe('availability detection', () => {
      it('should use yarn when available', () => {
        mockExecSync.mockImplementation((command: string) => {
          if (command === 'yarn --version') return Buffer.from('1.22.0');
          throw new Error('Command not found');
        });

        const installer = new AutoInstaller('/test/workspace');
        expect(installer.getPackageManager()).toBe('yarn');
        expect(mockLogger.verbose).toHaveBeenCalledWith('Using yarn as package manager');
      });

      it('should prefer yarn over other package managers', () => {
        mockExecSync.mockImplementation((command: string) => {
          if (command.includes('--version')) return Buffer.from('1.0.0');
          throw new Error('Command not found');
        });

        const installer = new AutoInstaller('/test/workspace');
        expect(installer.getPackageManager()).toBe('yarn');
      });

      it('should fallback to npm when all others fail', () => {
        mockExecSync.mockImplementation((command: string) => {
          if (command === 'npm --version') return Buffer.from('8.0.0');
          throw new Error('Command not found');
        });

        const installer = new AutoInstaller('/test/workspace');
        expect(installer.getPackageManager()).toBe('npm');
      });

      it('should use npm as final fallback', () => {
        // All commands fail
        mockExecSync.mockImplementation(() => {
          throw new Error('Command not found');
        });

        const installer = new AutoInstaller('/test/workspace');
        expect(installer.getPackageManager()).toBe('npm');
        expect(mockLogger.verbose).toHaveBeenCalledWith('Falling back to npm as package manager');
      });
    });
  });

  describe('checkPluginInstalled', () => {
    beforeEach(() => {
      mockRequireResolve.mockImplementation(() => {
        throw new Error('Module not found');
      });
      mockExistsSync.mockReturnValue(false);
    });

    it('should return true when require.resolve succeeds', () => {
      mockRequireResolve.mockReturnValue('/path/to/package');

      const result = autoInstaller.checkPluginInstalled('test-package');
      expect(result).toBe(true);
      expect(mockRequireResolve).toHaveBeenCalledWith('test-package', { paths: ['/test/workspace'] });
    });

    it('should return true when package exists in node_modules', () => {
      mockExistsSync.mockImplementation((path: string) => 
        path.includes('test-package') && (path.endsWith('test-package') || path.endsWith('package.json'))
      );

      const result = autoInstaller.checkPluginInstalled('test-package');
      expect(result).toBe(true);
      expect(mockExistsSync).toHaveBeenCalledWith('/test/workspace/node_modules/test-package/package.json');
    });

    it('should handle scoped packages', () => {
      mockExistsSync.mockImplementation((path: string) => 
        path.includes('@scope/package') && path.endsWith('package.json')
      );

      const result = autoInstaller.checkPluginInstalled('@scope/package');
      expect(result).toBe(true);
      expect(mockExistsSync).toHaveBeenCalledWith('/test/workspace/node_modules/@scope/package/package.json');
    });

    it('should return false when package not found', () => {
      const result = autoInstaller.checkPluginInstalled('non-existent-package');
      expect(result).toBe(false);
    });
  });

  describe('CI detection', () => {
    it('should detect CI environment from CI variable', () => {
      process.env.CI = 'true';
      const result = (autoInstaller as any)['isCI']();
      expect(result).toBe(true);
    });

    it('should detect CI from CONTINUOUS_INTEGRATION', () => {
      process.env.CONTINUOUS_INTEGRATION = 'true';
      const result = (autoInstaller as any)['isCI']();
      expect(result).toBe(true);
    });

    it('should detect GitHub Actions', () => {
      process.env.GITHUB_ACTIONS = 'true';
      const result = (autoInstaller as any)['isCI']();
      expect(result).toBe(true);
    });

    it('should detect GitLab CI', () => {
      process.env.GITLAB_CI = 'true';
      const result = (autoInstaller as any)['isCI']();
      expect(result).toBe(true);
    });

    it('should detect Jenkins', () => {
      process.env.JENKINS_URL = 'https://jenkins.example.com';
      const result = (autoInstaller as any)['isCI']();
      expect(result).toBe(true);
    });

    it('should return false in non-CI environment', () => {
      const result = (autoInstaller as any)['isCI']();
      expect(result).toBe(false);
    });
  });

  describe('promptForInstall', () => {
    it('should return false in CI environment', async () => {
      process.env.CI = 'true';

      const result = await autoInstaller.promptForInstall('test-package');
      expect(result).toBe(false);
      expect(mockCreateInterface).not.toHaveBeenCalled();
    });

    it('should return true when user answers yes', async () => {
      mockReadline.question.mockImplementation((question: string, callback: Function) => {
        callback('y');
      });

      const result = await autoInstaller.promptForInstall('test-package');

      expect(result).toBe(true);
      expect(mockReadline.question).toHaveBeenCalledWith(
        'The plugin "test-package" is not installed. Would you like to install it now? (y/n): ',
        expect.any(Function)
      );
      expect(mockReadline.close).toHaveBeenCalled();
    });

    it('should return true when user answers yes (full word)', async () => {
      mockReadline.question.mockImplementation((question: string, callback: Function) => {
        callback('yes');
      });

      const result = await autoInstaller.promptForInstall('test-package');
      expect(result).toBe(true);
    });

    it('should return false when user answers no', async () => {
      mockReadline.question.mockImplementation((question: string, callback: Function) => {
        callback('n');
      });

      const result = await autoInstaller.promptForInstall('test-package');
      expect(result).toBe(false);
    });

    it('should handle case insensitive answers', async () => {
      mockReadline.question.mockImplementation((question: string, callback: Function) => {
        callback('Y');
      });

      const result = await autoInstaller.promptForInstall('test-package');
      expect(result).toBe(true);
    });

    it('should handle whitespace in answers', async () => {
      mockReadline.question.mockImplementation((question: string, callback: Function) => {
        callback('  yes  ');
      });

      const result = await autoInstaller.promptForInstall('test-package');
      expect(result).toBe(true);
    });
  });

  describe('buildInstallCommand', () => {
    let buildInstallCommand: (pm: string, pkg: string, dev: boolean, args: string[]) => string;

    beforeEach(() => {
      buildInstallCommand = (autoInstaller as any)['buildInstallCommand'].bind(autoInstaller);
    });

    it('should build npm install command', () => {
      const command = buildInstallCommand('npm', 'test-package', false, []);
      expect(command).toBe('npm install test-package');
    });

    it('should build npm install command with dev flag', () => {
      const command = buildInstallCommand('npm', 'test-package', true, []);
      expect(command).toBe('npm install test-package --save-dev');
    });

    it('should build yarn add command', () => {
      const command = buildInstallCommand('yarn', 'test-package', false, []);
      expect(command).toBe('yarn add test-package');
    });

    it('should build yarn add command with dev flag', () => {
      const command = buildInstallCommand('yarn', 'test-package', true, []);
      expect(command).toBe('yarn add test-package --dev');
    });

    it('should build pnpm add command', () => {
      const command = buildInstallCommand('pnpm', 'test-package', false, []);
      expect(command).toBe('pnpm add test-package');
    });

    it('should build bun add command', () => {
      const command = buildInstallCommand('bun', 'test-package', false, []);
      expect(command).toBe('bun add test-package');
    });

    it('should include additional args', () => {
      const command = buildInstallCommand('npm', 'test-package', false, ['--verbose', '--no-audit']);
      expect(command).toBe('npm install test-package --verbose --no-audit');
    });

    it('should throw error for unsupported package manager', () => {
      expect(() => buildInstallCommand('unsupported' as PackageManager, 'test-package', false, []))
        .toThrow('Unsupported package manager: unsupported');
    });
  });

  describe('installPlugin', () => {
    beforeEach(() => {
      // Mock successful installation by default
      mockExecSync.mockReturnValue(Buffer.from('Installed successfully'));
      mockRequireResolve.mockReturnValue('/path/to/package');
    });

    it('should install plugin successfully', async () => {
      const result = await autoInstaller.installPlugin('test-package');

      expect(result.success).toBe(true);
      expect(result.packageManager).toBe('npm'); // Default detected package manager
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install test-package',
        expect.objectContaining({
          cwd: '/test/workspace',
          stdio: 'inherit',
          timeout: 300000
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Installing test-package using npm...');
      expect(mockLogger.info).toHaveBeenCalledWith('Successfully installed test-package');
    });

    it('should skip installation if already installed', async () => {
      mockRequireResolve.mockReturnValue('/path/to/package');

      const result = await autoInstaller.installPlugin('test-package');

      expect(result.success).toBe(true);
      expect(mockExecSync).not.toHaveBeenCalled();
      expect(mockLogger.verbose).toHaveBeenCalledWith('Package test-package is already installed');
    });

    it('should force installation when force option is true', async () => {
      mockRequireResolve.mockReturnValue('/path/to/package');

      const result = await autoInstaller.installPlugin('test-package', { force: true });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalled();
    });

    it('should install as dev dependency when dev option is true', async () => {
      const result = await autoInstaller.installPlugin('test-package', { dev: true });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install test-package --save-dev',
        expect.any(Object)
      );
    });

    it('should use custom package manager', async () => {
      const result = await autoInstaller.installPlugin('test-package', { packageManager: 'yarn' });

      expect(result.success).toBe(true);
      expect(result.packageManager).toBe('yarn');
      expect(mockExecSync).toHaveBeenCalledWith(
        'yarn add test-package',
        expect.any(Object)
      );
    });

    it('should pass additional args', async () => {
      const result = await autoInstaller.installPlugin('test-package', {
        additionalArgs: ['--verbose', '--no-audit']
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install test-package --verbose --no-audit',
        expect.any(Object)
      );
    });

    it('should skip prompts with autoInstall option', async () => {
      const result = await autoInstaller.installPlugin('test-package', { autoInstall: true });

      expect(result.success).toBe(true);
      expect(mockCreateInterface).not.toHaveBeenCalled();
    });

    it('should skip prompts in CI environment', async () => {
      process.env.CI = 'true';

      const result = await autoInstaller.installPlugin('test-package');

      expect(result.success).toBe(true);
      expect(mockCreateInterface).not.toHaveBeenCalled();
    });

    it('should prompt user in interactive mode', async () => {
      mockReadline.question.mockImplementation((question: string, callback: Function) => {
        callback('y');
      });

      const result = await autoInstaller.installPlugin('test-package');

      expect(result.success).toBe(true);
      expect(mockReadline.question).toHaveBeenCalled();
    });

    it('should cancel installation when user declines', async () => {
      mockReadline.question.mockImplementation((question: string, callback: Function) => {
        callback('n');
      });

      const result = await autoInstaller.installPlugin('test-package');

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should handle installation command failure', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Installation failed');
      });

      const result = await autoInstaller.installPlugin('test-package', { autoInstall: true });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Installation failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to install test-package: Installation failed'
      );
    });

    it('should detect installation failure when package cannot be resolved after install', async () => {
      mockRequireResolve
        .mockImplementationOnce(() => { throw new Error('Not found'); }) // Before install
        .mockImplementationOnce(() => { throw new Error('Still not found'); }); // After install
      
      const result = await autoInstaller.installPlugin('test-package', { autoInstall: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('was installed but cannot be resolved');
    });

    it('should handle timeout errors', async () => {
      jest.setTimeout(10000);
      mockExecSync.mockImplementation(() => {
        // Simulate a command that throws timeout error
        throw new Error('Command timeout');
      });

      const result = await autoInstaller.installPlugin('test-package', { autoInstall: true });

      expect(result.success).toBe(false);
    });

    it('should log verbose installation command', async () => {
      await autoInstaller.installPlugin('test-package', { autoInstall: true });

      expect(mockLogger.verbose).toHaveBeenCalledWith('Running: npm install test-package');
    });
  });

  describe('package info retrieval', () => {
    let getPackageInfo: (packageName: string) => any;
    let resolvePackageJson: (packageName: string) => string;

    beforeEach(() => {
      getPackageInfo = (autoInstaller as any)['getPackageInfo'].bind(autoInstaller);
      resolvePackageJson = (autoInstaller as any)['resolvePackageJson'].bind(autoInstaller);
    });

    describe('resolvePackageJson', () => {
      it('should resolve package.json path', () => {
        mockRequireResolve.mockReturnValue('/node_modules/test-package/index.js');
        mockExistsSync.mockImplementation((path: string) => 
          path.includes('package.json') && path.includes('test-package')
        );
        mockReadFileSync.mockReturnValue(JSON.stringify({ name: 'test-package' }));

        const result = resolvePackageJson('test-package');
        expect(result).toBeTruthy();
      });

      it('should fallback to node_modules direct path', () => {
        mockRequireResolve.mockImplementation(() => {
          throw new Error('Cannot resolve');
        });
        mockExistsSync.mockImplementation((path: string) => 
          path.endsWith('/test-package/package.json')
        );

        const result = resolvePackageJson('test-package');
        expect(result).toBe('/test/workspace/node_modules/test-package/package.json');
      });

      it('should return null when package.json not found', () => {
        mockRequireResolve.mockImplementation(() => {
          throw new Error('Cannot resolve');
        });
        mockExistsSync.mockReturnValue(false);

        const result = resolvePackageJson('test-package');
        expect(result).toBeNull();
      });
    });

    describe('getPackageInfo', () => {
      beforeEach(() => {
        (autoInstaller as any)['resolvePackageJson'] = jest.fn().mockReturnValue('/path/to/package.json');
        mockExistsSync.mockReturnValue(true);
      });

      it('should return package info', () => {
        const packageJson = {
          name: 'test-package',
          version: '1.0.0',
          description: 'Test package description'
        };
        mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

        const result = getPackageInfo('test-package');

        expect(result).toEqual({
          version: '1.0.0',
          description: 'Test package description'
        });
      });

      it('should handle missing package.json', () => {
        (autoInstaller as any)['resolvePackageJson'] = jest.fn().mockReturnValue(null);

        const result = getPackageInfo('test-package');
        expect(result).toBeNull();
      });

      it('should handle JSON parse errors', () => {
        mockReadFileSync.mockImplementation(() => {
          throw new Error('Invalid JSON');
        });

        const result = getPackageInfo('test-package');
        expect(result).toBeNull();
        expect(mockLogger.verbose).toHaveBeenCalledWith(
          'Failed to read package info for test-package: Error: Invalid JSON'
        );
      });

      it('should handle file read errors', () => {
        mockExistsSync.mockReturnValue(false);

        const result = getPackageInfo('test-package');
        expect(result).toBeNull();
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete successful installation flow', async () => {
      // Package not initially installed
      mockRequireResolve
        .mockImplementationOnce(() => { throw new Error('Not found'); })
        .mockReturnValueOnce('/path/to/package');
      
      // User agrees to install
      mockReadline.question.mockImplementation((question: string, callback: Function) => {
        callback('yes');
      });

      const result = await autoInstaller.installPlugin('test-package');

      expect(result.success).toBe(true);
      expect(mockReadline.question).toHaveBeenCalled();
      expect(mockExecSync).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Successfully installed test-package');
    });

    it('should handle user declining installation', async () => {
      mockRequireResolve.mockImplementation(() => {
        throw new Error('Not found');
      });
      
      mockReadline.question.mockImplementation((question: string, callback: Function) => {
        callback('no');
      });

      const result = await autoInstaller.installPlugin('test-package');

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should handle installation with all options', async () => {
      const options: InstallOptions = {
        autoInstall: true,
        dev: true,
        force: true,
        packageManager: 'yarn',
        additionalArgs: ['--verbose']
      };

      const result = await autoInstaller.installPlugin('test-package', options);

      expect(result.success).toBe(true);
      expect(result.packageManager).toBe('yarn');
      expect(mockExecSync).toHaveBeenCalledWith(
        'yarn add test-package --dev --verbose',
        expect.any(Object)
      );
    });
  });
});