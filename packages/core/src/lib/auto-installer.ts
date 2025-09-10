/**
 * Auto-installation system for generator plugins
 * Handles automatic installation of plugins when they are requested but not available
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { access, constants } from 'fs';
import { join, resolve } from 'path';
import { AutoInstallOptions, Logger } from './interfaces';
import { AutoInstallerError, PluginInstallationError } from './errors';

const accessAsync = promisify(access);

export class AutoInstaller {
  private readonly defaultOptions: Required<AutoInstallOptions> = {
    packageManager: 'npm',
    global: false,
    registry: 'https://registry.npmjs.org',
    timeout: 60000, // 1 minute
    force: false
  };

  constructor(private readonly logger: Logger) {}

  /**
   * Install a package using the specified package manager
   */
  async installPackage(packageName: string, options: AutoInstallOptions = {}): Promise<void> {
    const installOptions = { ...this.defaultOptions, ...options };
    
    this.logger.info(`Installing package '${packageName}' using ${installOptions.packageManager}...`);

    try {
      // Check if already installed (unless force is true)
      if (!installOptions.force && await this.isPackageInstalled(packageName, installOptions)) {
        this.logger.info(`Package '${packageName}' is already installed`);
        return;
      }

      const args = this.buildInstallArgs(packageName, installOptions);
      await this.executePackageManager(installOptions.packageManager, args, installOptions.timeout);
      
      this.logger.info(`Successfully installed package '${packageName}'`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to install package '${packageName}': ${errorMessage}`);
      throw new PluginInstallationError(packageName, error instanceof Error ? error : new Error(errorMessage));
    }
  }

  /**
   * Uninstall a package using the specified package manager
   */
  async uninstallPackage(packageName: string, options: AutoInstallOptions = {}): Promise<void> {
    const installOptions = { ...this.defaultOptions, ...options };
    
    this.logger.info(`Uninstalling package '${packageName}' using ${installOptions.packageManager}...`);

    try {
      const args = this.buildUninstallArgs(packageName, installOptions);
      await this.executePackageManager(installOptions.packageManager, args, installOptions.timeout);
      
      this.logger.info(`Successfully uninstalled package '${packageName}'`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to uninstall package '${packageName}': ${errorMessage}`);
      throw new AutoInstallerError(`Failed to uninstall package '${packageName}': ${errorMessage}`, packageName);
    }
  }

  /**
   * Check if a package is already installed
   */
  async isPackageInstalled(packageName: string, options: AutoInstallOptions = {}): Promise<boolean> {
    const installOptions = { ...this.defaultOptions, ...options };

    try {
      if (installOptions.global) {
        return await this.isGlobalPackageInstalled(packageName, installOptions.packageManager);
      } else {
        return await this.isLocalPackageInstalled(packageName);
      }
    } catch {
      return false;
    }
  }

  /**
   * Get the installation path of a package
   */
  async getPackageInstallationPath(packageName: string, options: AutoInstallOptions = {}): Promise<string | null> {
    const installOptions = { ...this.defaultOptions, ...options };

    try {
      if (installOptions.global) {
        return await this.getGlobalPackagePath(packageName, installOptions.packageManager);
      } else {
        return await this.getLocalPackagePath(packageName);
      }
    } catch {
      return null;
    }
  }

  /**
   * Build installation arguments for the package manager
   */
  private buildInstallArgs(packageName: string, options: Required<AutoInstallOptions>): string[] {
    const args: string[] = [];

    switch (options.packageManager) {
      case 'npm':
        args.push('install');
        if (options.global) args.push('--global');
        if (options.registry !== this.defaultOptions.registry) {
          args.push('--registry', options.registry);
        }
        args.push(packageName);
        break;

      case 'yarn':
        if (options.global) {
          args.push('global', 'add');
        } else {
          args.push('add');
        }
        if (options.registry !== this.defaultOptions.registry) {
          args.push('--registry', options.registry);
        }
        args.push(packageName);
        break;

      case 'pnpm':
        args.push('install');
        if (options.global) args.push('--global');
        if (options.registry !== this.defaultOptions.registry) {
          args.push('--registry', options.registry);
        }
        args.push(packageName);
        break;

      default:
        throw new AutoInstallerError(`Unsupported package manager: ${options.packageManager}`);
    }

    return args;
  }

  /**
   * Build uninstallation arguments for the package manager
   */
  private buildUninstallArgs(packageName: string, options: Required<AutoInstallOptions>): string[] {
    const args: string[] = [];

    switch (options.packageManager) {
      case 'npm':
        args.push('uninstall');
        if (options.global) args.push('--global');
        args.push(packageName);
        break;

      case 'yarn':
        if (options.global) {
          args.push('global', 'remove');
        } else {
          args.push('remove');
        }
        args.push(packageName);
        break;

      case 'pnpm':
        args.push('uninstall');
        if (options.global) args.push('--global');
        args.push(packageName);
        break;

      default:
        throw new AutoInstallerError(`Unsupported package manager: ${options.packageManager}`);
    }

    return args;
  }

  /**
   * Execute package manager command
   */
  private async executePackageManager(packageManager: string, args: string[], timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.debug(`Executing: ${packageManager} ${args.join(' ')}`);

      const child = spawn(packageManager, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new AutoInstallerError(`Package manager command timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        
        if (code === 0) {
          this.logger.debug(`Package manager command completed successfully`);
          resolve();
        } else {
          this.logger.debug(`Package manager command failed with code ${code}`);
          this.logger.debug(`stderr: ${stderr}`);
          reject(new AutoInstallerError(`Package manager command failed with exit code ${code}: ${stderr || stdout}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(new AutoInstallerError(`Failed to execute package manager: ${error.message}`));
      });
    });
  }

  /**
   * Check if a local package is installed
   */
  private async isLocalPackageInstalled(packageName: string): Promise<boolean> {
    try {
      const packagePath = join(process.cwd(), 'node_modules', packageName);
      await accessAsync(packagePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a global package is installed
   */
  private async isGlobalPackageInstalled(packageName: string, packageManager: string): Promise<boolean> {
    try {
      const globalPath = await this.getGlobalPackagePath(packageName, packageManager);
      if (!globalPath) return false;
      await accessAsync(globalPath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the local package installation path
   */
  private async getLocalPackagePath(packageName: string): Promise<string | null> {
    const packagePath = join(process.cwd(), 'node_modules', packageName);
    try {
      await accessAsync(packagePath, constants.F_OK);
      return resolve(packagePath);
    } catch {
      return null;
    }
  }

  /**
   * Get the global package installation path
   */
  private async getGlobalPackagePath(packageName: string, packageManager: string): Promise<string | null> {
    try {
      // This is a simplified implementation - in practice, you'd need to query the package manager
      // for the actual global installation path
      let globalPrefix: string;
      
      switch (packageManager) {
        case 'npm':
          globalPrefix = process.env.NPM_CONFIG_PREFIX || '/usr/local';
          break;
        case 'yarn':
          globalPrefix = process.env.YARN_GLOBAL_FOLDER || '/usr/local';
          break;
        case 'pnpm':
          globalPrefix = process.env.PNPM_HOME || '/usr/local';
          break;
        default:
          return null;
      }

      const packagePath = join(globalPrefix, 'lib', 'node_modules', packageName);
      await accessAsync(packagePath, constants.F_OK);
      return resolve(packagePath);
    } catch {
      return null;
    }
  }

  /**
   * Detect the package manager being used in the current project
   */
  static async detectPackageManager(): Promise<'npm' | 'yarn' | 'pnpm'> {
    try {
      // Check for lock files to determine package manager
      await accessAsync('pnpm-lock.yaml', constants.F_OK);
      return 'pnpm';
    } catch {
      try {
        await accessAsync('yarn.lock', constants.F_OK);
        return 'yarn';
      } catch {
        return 'npm'; // Default fallback
      }
    }
  }
}