import { ExecutorContext, logger, PromiseExecutor } from '@nx/devkit';
import { spawn } from 'child_process';
import { rmSync } from 'fs';
import { join } from 'path';
import { GenerateApiExecutorSchema } from './schema';
import { log } from '../../generators/utils/log';
import { buildCommandArgs } from './utils/build-command';

const runExecutor: PromiseExecutor<GenerateApiExecutorSchema> = async (
  options,
  context: ExecutorContext
) => {
  const { inputSpec, outputPath } = options;

  try {
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
  } catch (error) {
    logger.error(log(`API generation failed with error`));
    logger.error(error);
    return {
      success: false,
    };
  }
};

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
