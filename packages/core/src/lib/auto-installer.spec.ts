import { execSync } from 'node:child_process';
import {
  detectCi,
  detectPackageManager,
  installPackages,
} from './auto-installer';

// Mock node:child_process
jest.mock('node:child_process', () => ({
  execSync: jest.fn(),
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
    it('should detect pnpm when available', () => {
      (execSync as jest.Mock).mockImplementation((cmd: string) => {
        if (cmd === 'pnpm -v') return;
        throw new Error('Command not found');
      });

      expect(detectPackageManager()).toBe('pnpm');
      expect(execSync).toHaveBeenCalledWith('pnpm -v', { stdio: 'ignore' });
    });

    it('should detect yarn when pnpm is not available', () => {
      (execSync as jest.Mock).mockImplementation((cmd: string) => {
        if (cmd === 'yarn -v') return;
        throw new Error('Command not found');
      });

      expect(detectPackageManager()).toBe('yarn');
      expect(execSync).toHaveBeenCalledWith('pnpm -v', { stdio: 'ignore' });
      expect(execSync).toHaveBeenCalledWith('yarn -v', { stdio: 'ignore' });
    });

    it('should default to npm when neither pnpm nor yarn is available', () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Command not found');
      });

      expect(detectPackageManager()).toBe('npm');
      expect(execSync).toHaveBeenCalledWith('pnpm -v', { stdio: 'ignore' });
      expect(execSync).toHaveBeenCalledWith('yarn -v', { stdio: 'ignore' });
    });

    it('should handle execution errors gracefully', () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Some error');
      });

      expect(detectPackageManager()).toBe('npm');
    });
  });

  describe('installPackages', () => {
    beforeEach(() => {
      delete process.env.CI;
    });

    describe('with pnpm', () => {
      beforeEach(() => {
        (execSync as jest.Mock).mockImplementation((cmd: string) => {
          if (cmd === 'pnpm -v') return;
          if (cmd.startsWith('pnpm add')) return;
          throw new Error('Command not found');
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
        (execSync as jest.Mock).mockImplementation((cmd: string) => {
          if (cmd === 'pnpm -v') throw new Error('Not found');
          if (cmd === 'yarn -v') return;
          if (cmd.startsWith('yarn add')) return;
          throw new Error('Command not found');
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
        (execSync as jest.Mock).mockImplementation((cmd: string) => {
          if (cmd === 'pnpm -v' || cmd === 'yarn -v') {
            throw new Error('Not found');
          }
          if (cmd.startsWith('npm install')) return;
          throw new Error('Command not found');
        });
      });

      it('should install dev dependencies by default', () => {
        installPackages(['package1', 'package2']);

        expect(execSync).toHaveBeenCalledWith(
          'npm install --save-dev package1 package2',
          { stdio: 'inherit' }
        );
      });

      it('should install dev dependencies when dev is true', () => {
        installPackages(['package1'], { dev: true });

        expect(execSync).toHaveBeenCalledWith(
          'npm install --save-dev package1',
          { stdio: 'inherit' }
        );
      });

      it('should install regular dependencies when dev is false', () => {
        installPackages(['package1'], { dev: false });

        expect(execSync).toHaveBeenCalledWith('npm install  package1', {
          stdio: 'inherit',
        });
      });
    });

    describe('CI environment', () => {
      beforeEach(() => {
        process.env.CI = 'true';
      });

      it('should not install packages in CI environment', () => {
        installPackages(['package1']);

        expect(execSync).toHaveBeenCalledWith('pnpm -v', { stdio: 'ignore' });
        expect(execSync).not.toHaveBeenCalledWith(
          expect.stringContaining('add'),
          expect.any(Object)
        );
        expect(execSync).not.toHaveBeenCalledWith(
          expect.stringContaining('install'),
          expect.any(Object)
        );
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        delete process.env.CI;
        (execSync as jest.Mock).mockImplementation((cmd: string) => {
          if (cmd === 'pnpm -v' || cmd === 'yarn -v') {
            throw new Error('Not found');
          }
          if (cmd.startsWith('npm install')) {
            throw new Error('Installation failed');
          }
        });
      });

      it('should handle installation errors gracefully', () => {
        expect(() => installPackages(['package1'])).not.toThrow();

        expect(execSync).toHaveBeenCalledWith(
          'npm install --save-dev package1',
          { stdio: 'inherit' }
        );
      });
    });

    describe('multiple packages', () => {
      beforeEach(() => {
        (execSync as jest.Mock).mockImplementation((cmd: string) => {
          if (cmd === 'pnpm -v') return;
          if (cmd.startsWith('pnpm add')) return;
          throw new Error('Command not found');
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

        expect(execSync).toHaveBeenCalledWith('pnpm add -D ', {
          stdio: 'inherit',
        });
      });
    });
  });
});
