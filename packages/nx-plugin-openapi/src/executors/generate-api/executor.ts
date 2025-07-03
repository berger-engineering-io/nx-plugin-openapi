import { ExecutorContext, logger, PromiseExecutor } from '@nx/devkit';
import { execSync } from 'child_process';
import { rmSync } from 'fs';
import { join } from 'path';
import { GenerateApiExecutorSchema } from './schema';
import { log } from '../../generators/utils/log';

const runExecutor: PromiseExecutor<GenerateApiExecutorSchema> = async (
  options,
  context: ExecutorContext
) => {
  const generatorType = 'typescript-angular';
  const {
    skipValidateSpec = false,
    inputSpec,
    outputPath,
    configFile,
  } = options;

  try {
    // TODO is there a better way?
    let command = `node node_modules/@openapitools/openapi-generator-cli/main.js generate`;
    command += ` -i ${inputSpec}`;
    command += ` -g ${generatorType}`;
    command += ` -o ${outputPath}`;

    if (configFile) {
      command += ` -c ${configFile}`;
    }

    if (skipValidateSpec) {
      command += ` --skip-validate-spec`;
    }

    logger.info(log('Starting to generate API from provided OpenAPI spec...'));
    logger.verbose(log(`Cleaning outputPath ${outputPath} first`));
    // Clean the output directory before generating
    const fullOutputPath = join(context.root, outputPath);
    rmSync(fullOutputPath, { recursive: true, force: true });

    execSync(command, {
      stdio: 'inherit',
      cwd: context.root,
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
