import { logger } from '@nx/devkit';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { createInterface } from 'readline';

/**
 * Package manager types supported for plugin installation
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

/**
 * Installation options
 */
export interface InstallOptions {
  /**
   * Skip interactive prompts and install automatically
   */
  autoInstall?: boolean;

  /**
   * Install as dev dependency
   */
  dev?: boolean;

  /**
   * Force installation even if package appears to be installed
   */
  force?: boolean;

  /**
   * Custom package manager to use
   */
  packageManager?: PackageManager;

  /**
   * Additional arguments to pass to the package manager
   */
  additionalArgs?: string[];
}

/**
 * Installation result
 */
export interface InstallResult {
  /**
   * Whether installation was successful
   */
  success: boolean;

  /**
   * Error message if installation failed
   */
  error?: string;

  /**
   * Whether the user cancelled the installation
   */
  cancelled?: boolean;

  /**
   * Package manager used for installation
   */
  packageManager?: PackageManager;
}

/**
 * Auto-installer for generator plugins
 */
export class AutoInstaller {
  private readonly cwd: string;
  private readonly packageManager: PackageManager;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.packageManager = this.detectPackageManager();
  }

  /**
   * Check if a plugin package is installed
   */
  public checkPluginInstalled(packageName: string): boolean {
    try {
      // First try to require.resolve the package
      require.resolve(packageName, { paths: [this.cwd] });
      return true;
    } catch {
      // If require.resolve fails, check node_modules directly
      const nodeModulesPath = join(this.cwd, 'node_modules', packageName);
      if (existsSync(nodeModulesPath)) {
        const packageJsonPath = join(nodeModulesPath, 'package.json');
        return existsSync(packageJsonPath);
      }

      // Check for scoped packages
      if (packageName.includes('/')) {
        const [scope, name] = packageName.split('/');
        const scopedPath = join(this.cwd, 'node_modules', scope, name);
        if (existsSync(scopedPath)) {
          const packageJsonPath = join(scopedPath, 'package.json');
          return existsSync(packageJsonPath);
        }
      }

      return false;
    }
  }

  /**
   * Install a plugin package
   */
  public async installPlugin(packageName: string, options: InstallOptions = {}): Promise<InstallResult> {
    try {
      const {
        autoInstall = false,
        dev = false,
        force = false,
        packageManager = this.packageManager,
        additionalArgs = []
      } = options;

      // Check if already installed and not forcing
      if (!force && this.checkPluginInstalled(packageName)) {
        logger.verbose(`Package ${packageName} is already installed`);
        return { success: true, packageManager };
      }

      // Skip prompts in CI or auto-install mode
      if (!autoInstall && !this.isCI()) {
        const shouldInstall = await this.promptForInstall(packageName);
        if (!shouldInstall) {
          return { success: false, cancelled: true };
        }
      }

      // Install the package
      const installCommand = this.buildInstallCommand(packageManager, packageName, dev, additionalArgs);
      
      logger.info(`Installing ${packageName} using ${packageManager}...`);
      logger.verbose(`Running: ${installCommand}`);

      execSync(installCommand, {
        cwd: this.cwd,
        stdio: 'inherit',
        timeout: 300000, // 5 minute timeout
      });

      // Verify installation
      const installed = this.checkPluginInstalled(packageName);
      if (!installed) {
        return {
          success: false,
          error: `Package ${packageName} was installed but cannot be resolved`,
          packageManager
        };
      }

      logger.info(`Successfully installed ${packageName}`);
      return { success: true, packageManager };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to install ${packageName}: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        packageManager: options.packageManager || this.packageManager
      };
    }
  }

  /**
   * Get the detected package manager
   */
  public getPackageManager(): PackageManager {
    return this.packageManager;
  }

  /**
   * Prompt user for installation (interactive mode only)
   */
  public async promptForInstall(packageName: string): Promise<boolean> {
    // Skip prompts in CI environments
    if (this.isCI()) {
      return false;
    }

    return new Promise((resolve) => {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const question = `The plugin "${packageName}" is not installed. Would you like to install it now? (y/n): `;
      
      rl.question(question, (answer) => {
        rl.close();
        const normalizedAnswer = answer.trim().toLowerCase();
        resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes');
      });
    });
  }

  /**
   * Detect which package manager to use
   */
  private detectPackageManager(): PackageManager {
    // Check for lock files to determine package manager
    const lockFiles = [
      { file: 'package-lock.json', pm: 'npm' as const },
      { file: 'yarn.lock', pm: 'yarn' as const },
      { file: 'pnpm-lock.yaml', pm: 'pnpm' as const },
      { file: 'bun.lockb', pm: 'bun' as const },
    ];

    for (const { file, pm } of lockFiles) {
      if (existsSync(join(this.cwd, file))) {
        logger.verbose(`Detected ${pm} from ${file}`);
        return pm;
      }
    }

    // Check environment variable
    const npmConfigUserAgent = process.env.npm_config_user_agent;
    if (npmConfigUserAgent) {
      if (npmConfigUserAgent.includes('yarn')) return 'yarn';
      if (npmConfigUserAgent.includes('pnpm')) return 'pnpm';
      if (npmConfigUserAgent.includes('bun')) return 'bun';
    }

    // Check which package managers are available
    const availableManagers: PackageManager[] = [];
    
    for (const pm of ['npm', 'yarn', 'pnpm', 'bun'] as const) {
      try {
        execSync(`${pm} --version`, { stdio: 'ignore' });
        availableManagers.push(pm);
      } catch {
        // Package manager not available
      }
    }

    // Prefer yarn > pnpm > npm > bun for new projects
    const preferredOrder: PackageManager[] = ['yarn', 'pnpm', 'npm', 'bun'];
    for (const pm of preferredOrder) {
      if (availableManagers.includes(pm)) {
        logger.verbose(`Using ${pm} as package manager`);
        return pm;
      }
    }

    // Fallback to npm (should always be available in Node.js environments)
    logger.verbose('Falling back to npm as package manager');
    return 'npm';
  }

  /**
   * Check if running in CI environment
   */
  private isCI(): boolean {
    return !!(
      process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.BUILD_NUMBER ||
      process.env.RUN_ID ||
      // Common CI environment variables
      process.env.GITHUB_ACTIONS ||
      process.env.GITLAB_CI ||
      process.env.JENKINS_URL ||
      process.env.TRAVIS ||
      process.env.CIRCLECI ||
      process.env.BUILDKITE ||
      process.env.DRONE ||
      process.env.TEAMCITY_VERSION
    );
  }

  /**
   * Build the install command for the specified package manager
   */
  private buildInstallCommand(
    packageManager: PackageManager, 
    packageName: string, 
    dev: boolean, 
    additionalArgs: string[]
  ): string {
    const devFlag = dev ? '--save-dev' : '';
    const args = additionalArgs.join(' ');

    switch (packageManager) {
      case 'npm':
        return `npm install ${packageName} ${devFlag} ${args}`.trim();
      
      case 'yarn':
        const yarnDevFlag = dev ? '--dev' : '';
        return `yarn add ${packageName} ${yarnDevFlag} ${args}`.trim();
      
      case 'pnpm':
        return `pnpm add ${packageName} ${devFlag} ${args}`.trim();
      
      case 'bun':
        return `bun add ${packageName} ${devFlag} ${args}`.trim();
      
      default:
        throw new Error(`Unsupported package manager: ${packageManager}`);
    }
  }

  /**
   * Get package information from package.json
   */
  private getPackageInfo(packageName: string): { version?: string; description?: string } | null {
    try {
      const packageJsonPath = this.resolvePackageJson(packageName);
      if (!packageJsonPath || !existsSync(packageJsonPath)) {
        return null;
      }

      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      return {
        version: packageJson.version,
        description: packageJson.description
      };
    } catch (error) {
      logger.verbose(`Failed to read package info for ${packageName}: ${error}`);
      return null;
    }
  }

  /**
   * Resolve path to package.json for a given package
   */
  private resolvePackageJson(packageName: string): string | null {
    try {
      // Try to resolve the package first
      const packagePath = require.resolve(packageName, { paths: [this.cwd] });
      
      // Navigate up directories to find package.json
      let currentDir = packagePath;
      while (currentDir !== join(currentDir, '..')) {
        currentDir = join(currentDir, '..');
        const packageJsonPath = join(currentDir, 'package.json');
        
        if (existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
          // Check if this is the package we're looking for
          if (packageJson.name === packageName) {
            return packageJsonPath;
          }
        }
      }

      // Fallback: check in node_modules directly
      const nodeModulesPath = join(this.cwd, 'node_modules', packageName, 'package.json');
      if (existsSync(nodeModulesPath)) {
        return nodeModulesPath;
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}

/**
 * Default auto-installer instance
 */
export const autoInstaller = new AutoInstaller();