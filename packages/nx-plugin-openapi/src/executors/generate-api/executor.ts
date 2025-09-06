import { ExecutorContext, logger, PromiseExecutor } from '@nx/devkit';
import { spawn } from 'child_process';
import { rmSync } from 'fs';
import { join } from 'path';
import { GenerateApiExecutorSchema } from './schema';
import { log } from '../../generators/utils/log';
import { buildCommandArgs } from './utils/build-command';
import { GeneratorRegistry, GeneratorOptions, GeneratorContext, GeneratorNotFoundError } from '../../lib/core';

const runExecutor: PromiseExecutor<GenerateApiExecutorSchema> = async (
  options,
  context: ExecutorContext
) => {
  const { inputSpec, outputPath, generator = 'openapi-tools', autoInstall = false } = options;

  try {
    // Initialize the generator registry with auto-install options
    const registry = GeneratorRegistry.getInstance({
      autoInstall,
      skipPrompts: true // Skip prompts in executor context
    });

    // Get the generator plugin
    let generatorPlugin;
    try {
      generatorPlugin = registry.get(generator);
    } catch (error) {
      if (error instanceof GeneratorNotFoundError && autoInstall) {
        logger.info(log(`Generator '${generator}' not found. Attempting to load and install...`));
        
        try {
          const discoveryResult = await registry.loadAndRegisterWithAutoInstall(generator, {
            autoInstall: true,
            skipPrompts: true
          });
          
          if (!discoveryResult) {
            throw new Error(`Failed to auto-install generator: ${generator}`);
          }
          
          generatorPlugin = registry.get(generator);
          logger.info(log(`Successfully installed and loaded generator: ${generator}`));
        } catch (installError) {
          logger.warn(log(`Auto-install failed for generator '${generator}': ${installError}`));
          logger.info(log(`Falling back to legacy execution method...`));
          return await executeLegacyMethod(options, context);
        }
      } else {
        logger.warn(log(`Generator '${generator}' not found. Falling back to legacy execution method...`));
        return await executeLegacyMethod(options, context);
      }
    }

    // Check if inputSpec is a string or object
    if (typeof inputSpec === 'string') {
      // Single spec - use generator plugin
      logger.info(log('Starting to generate API from provided OpenAPI spec...'));
      logger.verbose(log(`Cleaning outputPath ${outputPath} first`));

      // Clean the output directory before generating
      const fullOutputPath = join(context.root, outputPath);
      rmSync(fullOutputPath, { recursive: true, force: true });

      // Convert executor options to generator options
      const generatorOptions: GeneratorOptions = convertToGeneratorOptions(options);
      const generatorContext: GeneratorContext = { ...context };

      // Execute using the generator plugin
      const result = await generatorPlugin.generate(generatorOptions, generatorContext);

      if (!result.success) {
        throw new Error(`Generator failed: ${result.errors.join(', ')}`);
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => logger.warn(log(warning)));
      }

      logger.info(log(`API generation completed successfully.`));
    } else {
      // Multiple specs - generate each in a subdirectory using generator plugin
      logger.info(log('Starting to generate APIs from multiple OpenAPI specs...'));
      
      const specEntries = Object.entries(inputSpec);
      
      for (const [serviceName, specPath] of specEntries) {
        logger.info(log(`Generating API for ${serviceName}...`));
        
        // Create service-specific output path
        const serviceOutputPath = join(outputPath, serviceName);
        const fullServiceOutputPath = join(context.root, serviceOutputPath);
        
        // Clean the service-specific output directory
        logger.verbose(log(`Cleaning outputPath ${serviceOutputPath} first`));
        rmSync(fullServiceOutputPath, { recursive: true, force: true });
        
        // Create options for this specific service
        const serviceOptions = {
          ...options,
          inputSpec: specPath,
          outputPath: serviceOutputPath
        };
        
        // Convert to generator options
        const generatorOptions: GeneratorOptions = convertToGeneratorOptions(serviceOptions);
        const generatorContext: GeneratorContext = { ...context };
        
        // Execute using the generator plugin
        const result = await generatorPlugin.generate(generatorOptions, generatorContext);
        
        if (!result.success) {
          throw new Error(`Generator failed for ${serviceName}: ${result.errors.join(', ')}`);
        }

        if (result.warnings.length > 0) {
          result.warnings.forEach(warning => logger.warn(log(`${serviceName}: ${warning}`)));
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
 * Convert executor schema options to generator options
 */
function convertToGeneratorOptions(options: GenerateApiExecutorSchema): GeneratorOptions {
  // Remove executor-specific fields and pass through generator options
  const { generator: _generator, autoInstall: _autoInstall, generatorOptions, ...generatorOpts } = options;
  
  return {
    ...generatorOpts,
    // Merge in any generator-specific options
    ...generatorOptions,
  } as GeneratorOptions;
}

/**
 * Fallback to legacy execution method for backward compatibility
 */
async function executeLegacyMethod(options: GenerateApiExecutorSchema, context: ExecutorContext) {
  const { inputSpec, outputPath } = options;

  logger.info(log('Using legacy execution method...'));

  // Check if inputSpec is a string or object
  if (typeof inputSpec === 'string') {
    // Single spec - maintain existing behavior
    logger.info(log('Starting to generate API from provided OpenAPI spec...'));
    logger.verbose(log(`Cleaning outputPath ${outputPath} first`));

    // Clean the output directory before generating
    const fullOutputPath = join(context.root, outputPath);
    rmSync(fullOutputPath, { recursive: true, force: true });

    // Build command arguments
    const args = buildCommandArgs(options);

    // Execute OpenAPI Generator
    await executeOpenApiGenerator(args, context);

    logger.info(log(`API generation completed successfully.`));
  } else {
    // Multiple specs - generate each in a subdirectory
    logger.info(log('Starting to generate APIs from multiple OpenAPI specs...'));
    
    const specEntries = Object.entries(inputSpec);
    
    for (const [serviceName, specPath] of specEntries) {
      logger.info(log(`Generating API for ${serviceName}...`));
      
      // Create service-specific output path
      const serviceOutputPath = join(outputPath, serviceName);
      const fullServiceOutputPath = join(context.root, serviceOutputPath);
      
      // Clean the service-specific output directory
      logger.verbose(log(`Cleaning outputPath ${serviceOutputPath} first`));
      rmSync(fullServiceOutputPath, { recursive: true, force: true });
      
      // Create options for this specific service
      const serviceOptions = {
        ...options,
        inputSpec: specPath,
        outputPath: serviceOutputPath
      };
      
      // Build command arguments
      const args = buildCommandArgs(serviceOptions);
      
      // Execute OpenAPI Generator for this service
      await executeOpenApiGenerator(args, context);
      
      logger.info(log(`API generation for ${serviceName} completed successfully.`));
    }
    
    logger.info(log(`All API generations completed successfully.`));
  }

  return {
    success: true,
  };
}

async function executeOpenApiGenerator(args: string[], context: ExecutorContext): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const childProcess = spawn(
      'node',
      ['node_modules/@openapitools/openapi-generator-cli/main.js', ...args],
      {
        cwd: context.root,
        stdio: 'inherit',
      }
    );

    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`OpenAPI Generator exited with code ${code}`));
      }
    });

    childProcess.on('error', (error) => {
      reject(error);
    });
  });
}

export default runExecutor;
