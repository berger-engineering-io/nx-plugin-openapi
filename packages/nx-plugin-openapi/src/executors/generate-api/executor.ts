import { ExecutorContext, PromiseExecutor, logger } from '@nx/devkit';
import { execSync } from 'child_process';
import { rmSync } from 'fs';
import { join } from 'path';
import { GenerateApiExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<GenerateApiExecutorSchema> = async (
  options,
  context: ExecutorContext
) => {
  const {
    generatorType = 'typescript-angular',
    skipValidateSpec = false,
    inputSpec,
    outputPath,
    configFile,
  } = options;

  try {
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

    console.log(`Running command: ${command}`);
    logger.info(
      '[@lambda-solutions/nx-plugin-openapi] Starting to generate API from provided OpenAPI spec...'
    );
    logger.verbose(
      `[@lambda-solutions/nx-plugin-openapi] Cleaning outputPath ${outputPath} first`
    );
    // Clean the output directory before generating
    const fullOutputPath = join(context.root, outputPath);
    rmSync(fullOutputPath, { recursive: true, force: true });

    execSync(command, {
      stdio: 'inherit',
      cwd: context.root,
    });
    // currently disabled
    if (false) {
      if (inputSpec.startsWith('http://') || inputSpec.startsWith('https://')) {
        console.log(`Spec path is a URL: ${inputSpec}`);
        const response = await fetch(inputSpec);
        if (response.ok) {
          const content = await response.text();
          const projectName = context.projectName || 'default';
          // write the content to .nx-plugin-openapi/{projectName}/api.json
          const apiPath = join(
            context.root,
            '.nx-plugin-openapi',
            projectName,
            'api.json'
          );
          const fs = require('fs');
          fs.mkdirSync(join(context.root, '.nx-plugin-openapi', projectName), {
            recursive: true,
          });
          fs.writeFileSync(apiPath, content);
          console.log(`API spec saved to: ${apiPath}`);
        }
      } else {
        console.log(`Spec path is a local file: ${inputSpec}`);
      }
    }

    logger.info(
      `[@lambda-solutions/nx-plugin-openapi] API generation completed successfully.`
    );
    return {
      success: true,
    };
  } catch (error) {
    logger.error(
      `[@lambda-solutions/nx-plugin-openapi] API generation failed with error`
    );
    logger.error(error);
    return {
      success: false,
    };
  }
};

export default runExecutor;
