/**
 * Example usage of the AutoInstaller functionality
 * This file demonstrates how to use the auto-installer in your plugin or generator
 */

import { logger } from '@nx/devkit';
import { AutoInstaller, PluginLoader, GeneratorRegistry } from './index';

/**
 * Example 1: Basic auto-installation
 */
export async function exampleBasicAutoInstall() {
  const autoInstaller = new AutoInstaller();
  
  // Check if a plugin is installed
  const isInstalled = autoInstaller.checkPluginInstalled('@openapitools/openapi-generator-cli');
  console.log('Plugin installed:', isInstalled);
  
  if (!isInstalled) {
    // Install the plugin automatically (will prompt in interactive mode)
    const result = await autoInstaller.installPlugin('@openapitools/openapi-generator-cli');
    
    if (result.success) {
      logger.info('Plugin installed successfully!');
    } else {
      logger.error(`Failed to install plugin: ${result.error}`);
    }
  }
}

/**
 * Example 2: Auto-install with PluginLoader
 */
export async function examplePluginLoaderWithAutoInstall() {
  // Create a plugin loader with auto-install enabled
  const pluginLoader = new PluginLoader({
    autoInstall: true,  // Enable automatic installation
    skipPrompts: false, // Allow interactive prompts (disable for CI)
  });
  
  try {
    // This will automatically install the plugin if it's not found
    const pluginResult = await pluginLoader.loadPlugin('some-openapi-generator-plugin');
    logger.info(`Plugin loaded: ${pluginResult.plugin.name}`);
  } catch (error) {
    logger.error(`Failed to load plugin: ${error}`);
  }
}

/**
 * Example 3: Registry with auto-installation
 */
export async function exampleRegistryWithAutoInstall() {
  // Get registry instance with auto-install options
  const registry = GeneratorRegistry.getInstance({
    autoInstall: true,
    skipPrompts: process.env.CI === 'true', // Skip prompts in CI
  });
  
  try {
    // This will try to load and install the plugin if needed
    await registry.loadAndRegisterWithAutoInstall('custom-generator-package', {
      autoInstall: true,
    });
    
    logger.info(`Available generators: ${registry.getAvailableGeneratorNames().join(', ')}`);
  } catch (error) {
    logger.error(`Failed to load generator: ${error}`);
  }
}

/**
 * Example 4: CI-friendly installation
 */
export async function exampleCIFriendlyInstall() {
  const autoInstaller = new AutoInstaller();
  
  // In CI environments, you might want to fail fast
  const result = await autoInstaller.installPlugin('required-plugin', {
    autoInstall: true,  // Install automatically (CI will be detected automatically)
  });
  
  if (!result.success) {
    throw new Error(`Required plugin installation failed: ${result.error}`);
  }
}

/**
 * Example 5: Custom package manager
 */
export async function exampleCustomPackageManager() {
  const autoInstaller = new AutoInstaller();
  
  logger.info(`Detected package manager: ${autoInstaller.getPackageManager()}`);
  
  // Force use of a specific package manager
  const result = await autoInstaller.installPlugin('some-plugin', {
    autoInstall: true,
    packageManager: 'yarn',
    dev: true, // Install as dev dependency
    additionalArgs: ['--frozen-lockfile'], // Yarn-specific args
  });
  
  return result.success;
}

/**
 * Example 6: Checking installation status
 */
export function exampleCheckInstallation() {
  const autoInstaller = new AutoInstaller();
  
  const pluginsToCheck = [
    '@openapitools/openapi-generator-cli',
    'openapi-typescript',
    'swagger-codegen-cli',
  ];
  
  const installationStatus = pluginsToCheck.map(plugin => ({
    name: plugin,
    installed: autoInstaller.checkPluginInstalled(plugin),
  }));
  
  logger.info('Plugin installation status:');
  installationStatus.forEach(status => {
    logger.info(`  ${status.name}: ${status.installed ? '✓' : '✗'}`);
  });
  
  return installationStatus;
}

// Example usage in an executor or generator
export async function exampleInExecutor() {
  // This is how you might use auto-installer in your executor
  const registry = GeneratorRegistry.getInstance({
    autoInstall: !process.env.CI, // Only auto-install in non-CI environments
    skipPrompts: !!process.env.CI,
  });
  
  try {
    // Try to get the generator, install if needed
    const generator = registry.get('openapi-tools');
    return generator;
  } catch (error) {
    // If generator not found, try to install it
    logger.warn('Generator not found, attempting to install...');
    
    const result = await registry.loadAndRegisterWithAutoInstall('@openapitools/openapi-generator-cli');
    if (result) {
      return result.plugin;
    }
    
    throw new Error('Failed to load or install required generator');
  }
}