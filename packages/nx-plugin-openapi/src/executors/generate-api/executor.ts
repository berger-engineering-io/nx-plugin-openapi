import { ExecutorContext, PromiseExecutor, logger } from '@nx/devkit';
import { execSync } from 'child_process';
import { rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { GenerateApiExecutorSchema } from './schema';
import { RemoteCashedFileInfo } from './remote-cashed-file-info';
import { createHash } from 'crypto';

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
    await handleRemote({ context, options });

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

async function handleRemote(args: {
  context: ExecutorContext;
  options: GenerateApiExecutorSchema;
}) {
  /**
   * If the inputSpec is a URL, fetch the content and save it to .nx-plugin-openapi/{projectName}/api.json
   *
   * Calculate hash and timestamp
   */
  const { context, options } = args;
  const { inputSpec } = options;
  if (inputSpec.startsWith('http://') || inputSpec.startsWith('https://')) {
    logger.verbose(
      `[@lambda-solutions/nx-plugin-openapi] Spec path is a remote URL: ${inputSpec}`
    );
    logger.verbose(
      `[@lambda-solutions/nx-plugin-openapi] Fetching remote OpenAPI spec...`
    );
    const response = await fetch(inputSpec);
    if (!response.ok) {
      logger.error(
        `[@lambda-solutions/nx-plugin-openapi] Failed to fetch remote OpenAPI spec: ${response.statusText}`
      );
    }
    logger.verbose(
      `[@lambda-solutions/nx-plugin-openapi] Remote OpenAPI spec fetched successfully.`
    );
    if (response.ok) {
      const content = await response.text();
      const projectName = context.projectName || 'default';
      // write the content to .nx-plugin-openapi/{projectName}/api.json
      const apiPath = join(
        context.root,
        // todo config option
        '.nx-plugin-openapi',
        projectName,
        'api.json'
      );

      mkdirSync(join(context.root, '.nx-plugin-openapi', projectName), {
        recursive: true,
      });
      writeFileSync(apiPath, content);

      const cashedFilInfo = getRemoteCashedFileInfo({
        fileContent: content,
        remoteUrl: inputSpec,
      });

      const cashedFileInfoPath = join(
        context.root,
        '.nx-plugin-openapi',
        projectName,
        'cache-info.json'
      );
      writeFileSync(cashedFileInfoPath, JSON.stringify(cashedFilInfo, null, 2));

      logger.verbose(
        `[@lambda-solutions/nx-plugin-openapi] Remote API spec saved to: ${apiPath}`
      );
    }
  } else {
    logger.verbose(
      `[@lambda-solutions/nx-plugin-openapi] Spec path is a local file: ${inputSpec}`
    );
  }
}

function getRemoteCashedFileInfo(args: {
  fileContent: string;
  remoteUrl: string;
}): RemoteCashedFileInfo {
  return {
    hash: hashFileContent(args.fileContent),
    timestamp: Date.now(),
    remoteUrl: args.remoteUrl,
  };
}

function hashFileContent(fileContent: string): string {
  const hash = createHash('sha256');
  hash.update(fileContent, 'utf8');
  return hash.digest('hex');
}
