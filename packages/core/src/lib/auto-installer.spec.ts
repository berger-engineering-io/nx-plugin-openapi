import { execSync } from 'node:child_process';
import {
  detectCi,
  detectPackageManager,
  installPackages,
} from './auto-installer';
import {
  detectPackageManager as nxDetectPackageManager,
  getPackageManagerCommand,
} from '@nx/devkit';

// Mock node:child_process
jest.mock('node:child_process', () => ({
  execSync: jest.fn(),
}));

// Mock @nx/devkit
jest.mock('@nx/devkit', () => ({
  detectPackageManager: jest.fn(),
  getPackageManagerCommand: jest.fn(),
}));

describe('auto-installer', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('detectCi', () => {
    it('should return true when CI environment variable is set', () => {
      process.env.CI = 'true';
      expect(detectCi()).toBe(true);
    });

    it('should return true when CI is set to any value', () => {
      process.env.CI = '1';
      expect(detectCi()).toBe(true);

      process.env.CI = 'false'; // Even 'false' string is truthy
      expect(detectCi()).toBe(true);
    });

    it('should return false when CI environment variable is not set', () => {
      delete process.env.CI;
      expect(detectCi()).toBe(false);
    });

    it('should return false when CI is empty string', () => {
      process.env.CI = '';
      expect(detectCi()).toBe(false);
    });
  });

  describe('detectPackageManager', () => {
    it('should detect pnpm when project uses pnpm-lock.yaml', () => {
      (nxDetectPackageManager as jest.Mock).mockReturnValue('pnpm');

      expect(detectPackageManager()).toBe('pnpm');
      expect(nxDetectPackageManager).toHaveBeenCalled();
    });

    it('should detect yarn when project uses yarn.lock', () => {
      (nxDetectPackageManager as jest.Mock).mockReturnValue('yarn');

      expect(detectPackageManager()).toBe('yarn');
      expect(nxDetectPackageManager).toHaveBeenCalled();
    });

    it('should detect npm when project uses package-lock.json', () => {
      (nxDetectPackageManager as jest.Mock).mockReturnValue('npm');

      expect(detectPackageManager()).toBe('npm');
      expect(nxDetectPackageManager).toHaveBeenCalled();
    });

    it('should delegate to @nx/devkit detectPackageManager', () => {
      (nxDetectPackageManager as jest.Mock).mockReturnValue('npm');

      detectPackageManager();

      expect(nxDetectPackageManager).toHaveBeenCalledTimes(1);
    });
  });

  describe('installPackages', () => {
    beforeEach(() => {
      delete process.env.CI;
    });

    describe('with pnpm', () => {
      beforeEach(() => {
        (nxDetectPackageManager as jest.Mock).mockReturnValue('pnpm');
        (getPackageManagerCommand as jest.Mock).mockReturnValue({
          add: 'pnpm add',
          addDev: 'pnpm add -D',
        });
      });

      it('should install dev dependencies by default', () => {
        installPackages(['package1', 'package2']);

        expect(execSync).toHaveBeenCalledWith('pnpm add -D package1 package2', {
          stdio: 'inherit',
        });
      });

      it('should install dev dependencies when dev is true', () => {
        installPackages(['package1'], { dev: true });

        expect(execSync).toHaveBeenCalledWith('pnpm add -D package1', {
          stdio: 'inherit',
        });
      });

      it('should install regular dependencies when dev is false', () => {
        installPackages(['package1'], { dev: false });

        expect(execSync).toHaveBeenCalledWith('pnpm add package1', {
          stdio: 'inherit',
        });
      });
    });

    describe('with yarn', () => {
      beforeEach(() => {
        (nxDetectPackageManager as jest.Mock).mockReturnValue('yarn');
        (getPackageManagerCommand as jest.Mock).mockReturnValue({
          add: 'yarn add',
          addDev: 'yarn add -D',
        });
      });

      it('should install dev dependencies by default', () => {
        installPackages(['package1', 'package2']);

        expect(execSync).toHaveBeenCalledWith('yarn add -D package1 package2', {
          stdio: 'inherit',
        });
      });

      it('should install dev dependencies when dev is true', () => {
        installPackages(['package1'], { dev: true });

        expect(execSync).toHaveBeenCalledWith('yarn add -D package1', {
          stdio: 'inherit',
        });
      });

      it('should install regular dependencies when dev is false', () => {
        installPackages(['package1'], { dev: false });

        expect(execSync).toHaveBeenCalledWith('yarn add package1', {
          stdio: 'inherit',
        });
      });
    });

    describe('with npm', () => {
      beforeEach(() => {
        (nxDetectPackageManager as jest.Mock).mockReturnValue('npm');
        (getPackageManagerCommand as jest.Mock).mockReturnValue({
          add: 'npm install',
          addDev: 'npm install -D',
        });
      });

      it('should install dev dependencies by default', () => {
        installPackages(['package1', 'package2']);

        expect(execSync).toHaveBeenCalledWith(
          'npm install -D package1 package2',
          { stdio: 'inherit' }
        );
      });

      it('should install dev dependencies when dev is true', () => {
        installPackages(['package1'], { dev: true });

        expect(execSync).toHaveBeenCalledWith('npm install -D package1', {
          stdio: 'inherit',
        });
      });

      it('should install regular dependencies when dev is false', () => {
        installPackages(['package1'], { dev: false });

        expect(execSync).toHaveBeenCalledWith('npm install package1', {
          stdio: 'inherit',
        });
      });
    });

    describe('CI environment', () => {
      beforeEach(() => {
        process.env.CI = 'true';
        (nxDetectPackageManager as jest.Mock).mockReturnValue('npm');
        (getPackageManagerCommand as jest.Mock).mockReturnValue({
          add: 'npm install',
          addDev: 'npm install -D',
        });
      });

      it('should not install packages in CI environment', () => {
        installPackages(['package1']);

        expect(execSync).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        delete process.env.CI;
        (nxDetectPackageManager as jest.Mock).mockReturnValue('npm');
        (getPackageManagerCommand as jest.Mock).mockReturnValue({
          add: 'npm install',
          addDev: 'npm install -D',
        });
        (execSync as jest.Mock).mockImplementation(() => {
          throw new Error('Installation failed');
        });
      });

      it('should handle installation errors gracefully', () => {
        expect(() => installPackages(['package1'])).not.toThrow();

        expect(execSync).toHaveBeenCalledWith('npm install -D package1', {
          stdio: 'inherit',
        });
      });
    });

    describe('multiple packages', () => {
      beforeEach(() => {
        (nxDetectPackageManager as jest.Mock).mockReturnValue('pnpm');
        (getPackageManagerCommand as jest.Mock).mockReturnValue({
          add: 'pnpm add',
          addDev: 'pnpm add -D',
        });
      });

      it('should install multiple packages at once', () => {
        installPackages(['@types/node', 'typescript', 'jest']);

        expect(execSync).toHaveBeenCalledWith(
          'pnpm add -D @types/node typescript jest',
          { stdio: 'inherit' }
        );
      });

      it('should handle empty package list', () => {
        installPackages([]);

        expect(execSync).not.toHaveBeenCalled();
        expect(getPackageManagerCommand).not.toHaveBeenCalled();
      });
    });
  });
});
