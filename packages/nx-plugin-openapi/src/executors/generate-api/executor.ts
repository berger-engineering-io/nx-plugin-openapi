import { ExecutorContext, logger, PromiseExecutor } from '@nx/devkit';
import { rmSync } from 'fs';
import { join } from 'path';
import { GenerateApiExecutorSchema } from './schema';
import { log } from '../../generators/utils/log';
import { GeneratorRegistry } from '../../lib/core/registry';
import { PluginLoader } from '../../lib/core/plugin-loader';
import { PluginAutoInstaller } from '../../lib/core/auto-installer';
import { GeneratorOptions } from '../../lib/core/interfaces';
import { OpenAPIToolsGenerator } from '../../lib/bundled/openapi-tools/generator';

const runExecutor: PromiseExecutor<GenerateApiExecutorSchema> = async (
  options,
  context: ExecutorContext
) => {
  const { inputSpec, outputPath, generator: generatorName, autoInstall } = options;

  try {
    // Initialize registry and register bundled generator
    const registry = GeneratorRegistry.getInstance();
    
    // Register the bundled OpenAPI Tools generator for backward compatibility
    const bundledGenerator = new OpenAPIToolsGenerator();
    registry.register(bundledGenerator);
    
    // Set default generator if not already set
    if (!registry.has(registry.getDefaultName())) {
      registry.setDefault('openapi-tools');
    }

    // Initialize plugin loader
    const pluginLoader = new PluginLoader(registry);
    const autoInstaller = new PluginAutoInstaller();

    // Determine which generator to use
    const selectedGeneratorName = generatorName || 'openapi-tools';
    
    // Try to get the generator
    let generator = registry.get(selectedGeneratorName);
    
    // If generator not found, try to load it
    if (!generator) {
      try {
        // Try to load the plugin
        await pluginLoader.discoverPlugins();
        generator = registry.get(selectedGeneratorName);
        
        // If still not found and auto-install is enabled, install it
        if (!generator && autoInstall !== false) {
          const installed = await autoInstaller.ensurePluginInstalled(
            selectedGeneratorName,
            context,
            { prompt: autoInstall === true, ci: process.env.CI === 'true' }
          );
          
          if (installed) {
            // Try loading again after installation
            generator = await pluginLoader.loadPlugin(selectedGeneratorName);
          }
        }
      } catch (error) {
        logger.warn(log(`Failed to load generator '${selectedGeneratorName}': ${error}`));
      }
    }
    
    // If still no generator found, throw error
    if (!generator) {
      throw new Error(
        `Generator '${selectedGeneratorName}' not found. ` +
        `Available generators: ${registry.listNames().join(', ')}`
      );
    }

    // Check if generator is available
    const isAvailable = await generator.isAvailable();
    if (!isAvailable) {
      const errorMsg = generator.packageName
        ? `Generator '${selectedGeneratorName}' requires package '${generator.packageName}' to be installed`
        : `Generator '${selectedGeneratorName}' is not available`;
      throw new Error(errorMsg);
    }

    // Check if inputSpec is a string or object
    if (typeof inputSpec === 'string') {
      // Single spec - maintain existing behavior
      logger.info(log(`Starting to generate API using ${generator.displayName}...`));
      logger.verbose(log(`Cleaning outputPath ${outputPath} first`));

      // Clean the output directory before generating
      const fullOutputPath = join(context.root, outputPath);
      rmSync(fullOutputPath, { recursive: true, force: true });

      // Prepare generator options
      const generatorOptions: GeneratorOptions = {
        inputSpec,
        outputPath,
        generatorType: options.generatorType,
        config: extractGeneratorConfig(options),
        globalProperties: options.globalProperties,
        context,
        rawOptions: options as unknown as Record<string, unknown>,
      };

      // Validate options
      const validation = generator.validateOptions(generatorOptions);
      if (!validation.valid) {
        const errors = validation.errors?.map(e => `  - ${e.path}: ${e.message}`).join('\n');
        throw new Error(`Invalid options for generator '${selectedGeneratorName}':\n${errors}`);
      }

      // Generate API
      const result = await generator.generate(generatorOptions);
      
      if (!result.success) {
        throw result.error || new Error('Generation failed');
      }

      logger.info(log(`API generation completed successfully.`));
    } else {
      // Multiple specs - generate each in a subdirectory
      logger.info(log(`Starting to generate APIs from multiple OpenAPI specs using ${generator.displayName}...`));
      
      const specEntries = Object.entries(inputSpec);
      
      for (const [serviceName, specPath] of specEntries) {
        logger.info(log(`Generating API for ${serviceName}...`));
        
        // Create service-specific output path
        const serviceOutputPath = join(outputPath, serviceName);
        const fullServiceOutputPath = join(context.root, serviceOutputPath);
        
        // Clean the service-specific output directory
        logger.verbose(log(`Cleaning outputPath ${serviceOutputPath} first`));
        rmSync(fullServiceOutputPath, { recursive: true, force: true });
        
        // Prepare generator options for this service
        const generatorOptions: GeneratorOptions = {
          inputSpec: specPath,
          outputPath: serviceOutputPath,
          generatorType: options.generatorType,
          config: extractGeneratorConfig(options),
          globalProperties: options.globalProperties,
          context,
          rawOptions: { ...options, inputSpec: specPath, outputPath: serviceOutputPath } as unknown as Record<string, unknown>,
        };

        // Validate options
        const validation = generator.validateOptions(generatorOptions);
        if (!validation.valid) {
          const errors = validation.errors?.map(e => `  - ${e.path}: ${e.message}`).join('\n');
          throw new Error(`Invalid options for generator '${selectedGeneratorName}':\n${errors}`);
        }

        // Generate API for this service
        const result = await generator.generate(generatorOptions);
        
        if (!result.success) {
          throw result.error || new Error(`Generation failed for ${serviceName}`);
        }
        
        logger.info(log(`API generation for ${serviceName} completed successfully.`));
      }
      
      logger.info(log(`All API generations completed successfully.`));
    }

    return {
      success: true,
    };
  } catch (error) {
    logger.error(log(`API generation failed with error`));
    logger.error(error);
    return {
      success: false,
    };
  }
};

/**
 * Extract generator-specific configuration from options
 */
function extractGeneratorConfig(options: GenerateApiExecutorSchema): Record<string, unknown> {
  // Remove known non-config fields
  const { inputSpec, outputPath, generator, generatorType, autoInstall, globalProperties, ...config } = options;
  return config;
}

export default runExecutor;
