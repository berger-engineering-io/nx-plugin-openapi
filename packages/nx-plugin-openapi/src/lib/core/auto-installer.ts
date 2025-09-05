import { ExecutorContext, logger } from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { AutoInstallOptions } from './interfaces';
import { PluginInstallError } from './errors';

/**
 * Auto-installer for generator plugins
 * Handles automatic installation of missing plugins
 */
export class PluginAutoInstaller {
  /**
   * Ensure a plugin is installed, prompting for installation if needed
   */
  async ensurePluginInstalled(
    pluginName: string,
    context: ExecutorContext,
    options?: AutoInstallOptions
  ): Promise<boolean> {
    const packageName = this.getPluginPackageName(pluginName);

    // Check if already installed
    if (await this.isInstalled(packageName, context.root)) {
      logger.verbose(`Plugin '${packageName}' is already installed`);
      return true;
    }

    // Check auto-install options
    const autoInstallOptions: AutoInstallOptions = {
      prompt: options?.prompt !== false,
      packageManager: options?.packageManager || this.detectPackageManager(context.root),
      ci: options?.ci || process.env.CI === 'true',
    };

    // In CI or if prompting is disabled, don't install
    if (autoInstallOptions.ci && autoInstallOptions.prompt) {
      throw new PluginInstallError(
        packageName,
        autoInstallOptions.packageManager || 'npm',
        new Error(`Plugin '${pluginName}' is not installed and CI mode is enabled`)
      );
    }

    // If prompting is disabled, throw error
    if (!autoInstallOptions.prompt) {
      throw new PluginInstallError(
        packageName,
        autoInstallOptions.packageManager || 'npm',
        new Error(
          `Plugin '${pluginName}' requires package '${packageName}' to be installed`
        )
      );
    }

    // Prompt user for installation
    const shouldInstall = await this.promptInstallation(packageName);
    if (!shouldInstall) {
      throw new PluginInstallError(
        packageName,
        autoInstallOptions.packageManager || 'npm',
        new Error(`User declined to install plugin '${pluginName}'`)
      );
    }

    // Install the plugin
    return this.installPlugin(
      packageName,
      context.root,
      autoInstallOptions.packageManager || 'npm'
    );
  }

  /**
   * Get the package name for a plugin
   */
  private getPluginPackageName(pluginName: string): string {
    // If it's already a scoped package, return as is
    if (pluginName.startsWith('@')) {
      return pluginName;
    }

    // Map known plugin names to packages
    const pluginMap: Record<string, string> = {
      'openapi-tools': '@lambda-solutions/nx-openapi-plugin-openapi-tools',
      'orval': '@lambda-solutions/nx-openapi-plugin-orval',
      'openapi-typescript': '@lambda-solutions/nx-openapi-plugin-openapi-typescript',
      'swagger-codegen': '@lambda-solutions/nx-openapi-plugin-swagger-codegen',
    };

    return pluginMap[pluginName] || pluginName;
  }

  /**
   * Check if a package is installed
   */
  async isInstalled(packageName: string, cwd: string): Promise<boolean> {
    try {
      require.resolve(packageName, { paths: [cwd] });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Prompt user for installation
   * Note: In a real implementation, this would use a proper prompting library
   * For now, we'll auto-approve in non-interactive environments
   */
  private async promptInstallation(packageName: string): Promise<boolean> {
    // In non-interactive environments, auto-approve
    if (!process.stdin.isTTY) {
      logger.info(`Auto-installing ${packageName} (non-interactive mode)`);
      return true;
    }

    logger.info(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.info(`The generator plugin '${packageName}' is not installed.`);
    logger.info(`This plugin is required to generate API code.`);
    logger.info(`\nWould you like to install it now?`);
    logger.info(`This will run: npm install --save-dev ${packageName}`);
    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // For now, we'll auto-approve
    // In a real implementation, you'd use a prompting library like inquirer
    logger.info(`Auto-approving installation for development purposes...`);
    
    return true;
  }

  /**
   * Install a plugin package
   */
  private installPlugin(
    packageName: string,
    cwd: string,
    packageManager: 'npm' | 'yarn' | 'pnpm'
  ): boolean {
    try {
      logger.info(`Installing ${packageName} using ${packageManager}...`);

      const installCommand = this.getInstallCommand(packageManager, packageName);
      
      logger.verbose(`Running: ${installCommand}`);
      execSync(installCommand, {
        cwd,
        stdio: 'inherit',
        env: { ...process.env },
      });

      logger.info(`✓ Successfully installed ${packageName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to install ${packageName}: ${error}`);
      throw new PluginInstallError(packageName, packageManager, error as Error);
    }
  }

  /**
   * Detect the package manager being used in the project
   */
  detectPackageManager(cwd: string): 'npm' | 'yarn' | 'pnpm' {
    // Check for lock files
    if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
      logger.verbose('Detected yarn from yarn.lock');
      return 'yarn';
    }
    
    if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
      logger.verbose('Detected pnpm from pnpm-lock.yaml');
      return 'pnpm';
    }
    
    if (fs.existsSync(path.join(cwd, 'package-lock.json'))) {
      logger.verbose('Detected npm from package-lock.json');
      return 'npm';
    }

    // Check for .npmrc or .yarnrc
    if (fs.existsSync(path.join(cwd, '.yarnrc')) || 
        fs.existsSync(path.join(cwd, '.yarnrc.yml'))) {
      logger.verbose('Detected yarn from .yarnrc');
      return 'yarn';
    }

    if (fs.existsSync(path.join(cwd, '.pnpmfile.cjs'))) {
      logger.verbose('Detected pnpm from .pnpmfile.cjs');
      return 'pnpm';
    }

    // Default to npm
    logger.verbose('Defaulting to npm');
    return 'npm';
  }

  /**
   * Get the install command for a package manager
   */
  private getInstallCommand(
    packageManager: 'npm' | 'yarn' | 'pnpm',
    packageName: string
  ): string {
    switch (packageManager) {
      case 'yarn':
        return `yarn add -D ${packageName}`;
      case 'pnpm':
        return `pnpm add -D ${packageName}`;
      case 'npm':
      default:
        return `npm install --save-dev ${packageName}`;
    }
  }

  /**
   * Install multiple plugins at once
   */
  async installPlugins(
    pluginNames: string[],
    context: ExecutorContext,
    options?: AutoInstallOptions
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const pluginName of pluginNames) {
      try {
        const success = await this.ensurePluginInstalled(pluginName, context, options);
        results.set(pluginName, success);
      } catch (error) {
        logger.error(`Failed to install plugin '${pluginName}': ${error}`);
        results.set(pluginName, false);
      }
    }
    
    return results;
  }

  /**
   * Check if a plugin dependency is satisfied
   */
  async checkDependency(
    dependency: string,
    cwd: string
  ): Promise<{ installed: boolean; version?: string }> {
    try {
      const [packageName] = dependency.includes('@', 1)
        ? dependency.split('@').filter(Boolean)
        : [dependency, undefined];

      const packageJsonPath = require.resolve(`${packageName}/package.json`, {
        paths: [cwd],
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const packageJson = require(packageJsonPath);
      
      return {
        installed: true,
        version: packageJson.version,
      };
    } catch {
      return { installed: false };
    }
  }

  /**
   * Check all dependencies for a plugin
   */
  async checkDependencies(
    dependencies: string[],
    cwd: string
  ): Promise<Map<string, { installed: boolean; version?: string }>> {
    const results = new Map<string, { installed: boolean; version?: string }>();
    
    for (const dependency of dependencies) {
      const result = await this.checkDependency(dependency, cwd);
      results.set(dependency, result);
    }
    
    return results;
  }

  /**
   * Get missing dependencies
   */
  async getMissingDependencies(
    dependencies: string[],
    cwd: string
  ): Promise<string[]> {
    const missing: string[] = [];
    
    for (const dependency of dependencies) {
      const result = await this.checkDependency(dependency, cwd);
      if (!result.installed) {
        missing.push(dependency);
      }
    }
    
    return missing;
  }
}