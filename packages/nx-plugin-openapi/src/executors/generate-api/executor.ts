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
  const { outputPath } = options;

  try {
    logger.info(log('Starting to generate API from provided OpenAPI spec...'));
    logger.verbose(log(`Cleaning outputPath ${outputPath} first`));
    
    // Clean the output directory before generating
    const fullOutputPath = join(context.root, outputPath);
    rmSync(fullOutputPath, { recursive: true, force: true });

    // Build command arguments
    const args = buildCommandArgs(options);
    
    // Execute OpenAPI Generator using spawn for security
    await new Promise<void>((resolve, reject) => {
      const child = spawn('node', ['node_modules/@openapitools/openapi-generator-cli/main.js', ...args], {
        cwd: context.root,
        stdio: 'inherit',
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`OpenAPI Generator exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });

    logger.info(log(`API generation completed successfully.`));
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

export default runExecutor;
