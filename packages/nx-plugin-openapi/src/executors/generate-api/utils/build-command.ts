import { GenerateApiExecutorSchema } from '../schema';

interface FlagConfig {
  flag: string;
  requiresQuotes?: boolean;
}

type OptionFlagMap = {
  [K in keyof GenerateApiExecutorSchema]?: FlagConfig | string;
};
const OPTION_FLAG_MAP: OptionFlagMap = {
  configFile: '-c',
  skipValidateSpec: '--skip-validate-spec',
  auth: '--auth',
  apiNameSuffix: '--api-name-suffix',
  apiPackage: '--api-package',
  artifactId: '--artifact-id',
  artifactVersion: '--artifact-version',
  dryRun: '--dry-run',
  enablePostProcessFile: '--enable-post-process-file',
  gitHost: '--git-host',
  gitRepoId: '--git-repo-id',
  gitUserId: '--git-user-id',
  groupId: '--group-id',
  httpUserAgent: { flag: '--http-user-agent', requiresQuotes: true },
  ignoreFileOverride: '--ignore-file-override',
  inputSpecRootDirectory: '--input-spec-root-directory',
  invokerPackage: '--invoker-package',
  logToStderr: '--log-to-stderr',
  minimalUpdate: '--minimal-update',
  modelNamePrefix: '--model-name-prefix',
  modelNameSuffix: '--model-name-suffix',
  modelPackage: '--model-package',
  packageName: '--package-name',
  releaseNote: { flag: '--release-note', requiresQuotes: true },
  removeOperationIdPrefix: '--remove-operation-id-prefix',
  skipOverwrite: '--skip-overwrite',
  skipOperationExample: '--skip-operation-example',
  strictSpec: '--strict-spec',
  templateDirectory: '--template-dir',
};

export function buildCommandArgs(options: GenerateApiExecutorSchema): string[] {
  const args: string[] = [];

  // Add base command arguments
  args.push('generate');
  args.push('-i', options.inputSpec as string); // Type assertion since we always pass string from executor
  args.push('-g', 'typescript-angular');
  args.push('-o', options.outputPath);

  // Handle regular options
  for (const [optionKey, flagConfig] of Object.entries(OPTION_FLAG_MAP)) {
    const value = options[optionKey as keyof GenerateApiExecutorSchema];

    if (
      value === undefined ||
      value === null ||
      value === false ||
      value === ''
    ) {
      continue;
    }

    const config =
      typeof flagConfig === 'string' ? { flag: flagConfig } : flagConfig;

    if (typeof value === 'boolean' && value === true) {
      args.push(config.flag);
    } else if (typeof value === 'string') {
      args.push(config.flag, value);
    }
  }

  // Handle globalProperties separately as it requires special handling
  if (options.globalProperties) {
    Object.entries(options.globalProperties).forEach(([key, value]) => {
      args.push('--global-property', `${key}=${value}`);
    });
  }

  return args;
}
