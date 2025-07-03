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
    auth,
    apiNameSuffix,
    apiPackage,
    artifactId,
    artifactVersion,
    dryRun = false,
    enablePostProcessFile = false,
    gitHost,
    gitRepoId,
    gitUserId,
    globalProperties,
    groupId,
    httpUserAgent,
    ignoreFileOverride,
    inputSpecRootDirectory,
    invokerPackage,
    logToStderr = false,
    minimalUpdate = false,
    modelNamePrefix,
    modelNameSuffix,
    modelPackage,
    packageName,
    releaseNote,
    removeOperationIdPrefix = false,
    skipOverwrite = false,
    skipOperationExample = false,
    strictSpec = false,
    templateDirectory,
  } = options;

  try {
    // TODO is there a better way?
    // in the options there are all cli arguments
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

    if (auth) {
      command += ` --auth ${auth}`;
    }

    if (apiNameSuffix) {
      command += ` --api-name-suffix ${apiNameSuffix}`;
    }

    if (apiPackage) {
      command += ` --api-package ${apiPackage}`;
    }

    if (artifactId) {
      command += ` --artifact-id ${artifactId}`;
    }

    if (artifactVersion) {
      command += ` --artifact-version ${artifactVersion}`;
    }

    if (dryRun) {
      command += ` --dry-run`;
    }

    if (enablePostProcessFile) {
      command += ` --enable-post-process-file`;
    }

    if (gitHost) {
      command += ` --git-host ${gitHost}`;
    }

    if (gitRepoId) {
      command += ` --git-repo-id ${gitRepoId}`;
    }

    if (gitUserId) {
      command += ` --git-user-id ${gitUserId}`;
    }

    if (globalProperties) {
      Object.entries(globalProperties).forEach(([key, value]) => {
        command += ` --global-property ${key}=${value}`;
      });
    }

    if (groupId) {
      command += ` --group-id ${groupId}`;
    }

    if (httpUserAgent) {
      command += ` --http-user-agent "${httpUserAgent}"`;
    }

    if (ignoreFileOverride) {
      command += ` --ignore-file-override ${ignoreFileOverride}`;
    }

    if (inputSpecRootDirectory) {
      command += ` --input-spec-root-directory ${inputSpecRootDirectory}`;
    }

    if (invokerPackage) {
      command += ` --invoker-package ${invokerPackage}`;
    }

    if (logToStderr) {
      command += ` --log-to-stderr`;
    }

    if (minimalUpdate) {
      command += ` --minimal-update`;
    }

    if (modelNamePrefix) {
      command += ` --model-name-prefix ${modelNamePrefix}`;
    }

    if (modelNameSuffix) {
      command += ` --model-name-suffix ${modelNameSuffix}`;
    }

    if (modelPackage) {
      command += ` --model-package ${modelPackage}`;
    }

    if (packageName) {
      command += ` --package-name ${packageName}`;
    }

    if (releaseNote) {
      command += ` --release-note "${releaseNote}"`;
    }

    if (removeOperationIdPrefix) {
      command += ` --remove-operation-id-prefix`;
    }

    if (skipOverwrite) {
      command += ` --skip-overwrite`;
    }

    if (skipOperationExample) {
      command += ` --skip-operation-example`;
    }

    if (strictSpec) {
      command += ` --strict-spec`;
    }

    if (templateDirectory) {
      command += ` --template-dir ${templateDirectory}`;
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
