import { ExecutorContext, PromiseExecutor } from '@nx/devkit';
import { execSync } from 'child_process';
import { rmSync } from 'fs';
import { join } from 'path';
import { GenerateApiExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<GenerateApiExecutorSchema> = async (
  options,
  context: ExecutorContext
) => {
  console.log('Executor ran for GenerateApi', options);

  const {
    generatorType = 'typescript-angular',
    skipValidateSpec = false,
    specPath,
    outputPath,
    configFile,
  } = options;
  // TODO support all options from https://openapi-generator.tech/docs/generators/typescript-angular/
  // also add parsion for cli arguments

  try {
    // Clean the output directory before generating
    const fullOutputPath = join(context.root, outputPath);
    console.log(`Cleaning output directory: ${fullOutputPath}`);
    rmSync(fullOutputPath, { recursive: true, force: true });

    let command = `node node_modules/@openapitools/openapi-generator-cli/main.js generate`;
    command += ` -i ${specPath}`;
    command += ` -g ${generatorType}`;
    command += ` -o ${outputPath}`;

    if (configFile) {
      command += ` -c ${configFile}`;
    }

    if (skipValidateSpec) {
      command += ` --skip-validate-spec`;
    }

    console.log(`Running command: ${command}`);

    execSync(command, {
      stdio: 'inherit',
      cwd: context.root,
    });
    // currently disabled
    if (false) {
      if (specPath.startsWith('http://') || specPath.startsWith('https://')) {
        console.log(`Spec path is a URL: ${specPath}`);
        const response = await fetch(specPath);
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
        console.log(`Spec path is a local file: ${specPath}`);
      }
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error generating API:', error);
    return {
      success: false,
    };
  }
};

export default runExecutor;
