export interface OpenApiGeneratorOptions {
  inputSpec?: string;
  outputPath?: string;
  configFile?: string;
  skipValidateSpec?: boolean;
  auth?: string;
  apiNameSuffix?: string;
  apiPackage?: string;
  artifactId?: string;
  artifactVersion?: string;
  dryRun?: boolean;
  enablePostProcessFile?: boolean;
  gitHost?: string;
  gitRepoId?: string;
  gitUserId?: string;
  globalProperties?: Record<string, string>;
  groupId?: string;
  httpUserAgent?: string;
  ignoreFileOverride?: string;
  inputSpecRootDirectory?: string;
  invokerPackage?: string;
  logToStderr?: boolean;
  minimalUpdate?: boolean;
  modelNamePrefix?: string;
  modelNameSuffix?: string;
  modelPackage?: string;
  packageName?: string;
  releaseNote?: string;
  removeOperationIdPrefix?: boolean;
  skipOverwrite?: boolean;
  skipOperationExample?: boolean;
  strictSpec?: boolean;
  templateDirectory?: string;
}

export type RequiredOptions = Required<Pick<OpenApiGeneratorOptions, 'inputSpec' | 'outputPath'>>;
export type CompleteOptions = RequiredOptions & OpenApiGeneratorOptions;

interface FlagConfig {
  flag: string;
  requiresQuotes?: boolean;
}

type OptionFlagMap = {
  [K in keyof OpenApiGeneratorOptions]?: FlagConfig | string;
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

function assertRequiredOptions(options: OpenApiGeneratorOptions): asserts options is CompleteOptions {
  if (!options.inputSpec) {
    throw new Error('inputSpec is required for OpenAPI generator');
  }
  if (!options.outputPath) {
    throw new Error('outputPath is required for OpenAPI generator');
  }
}

export function buildCommandArgs(options: OpenApiGeneratorOptions): string[] {
  assertRequiredOptions(options);
  
  const args: string[] = [];
  args.push('generate');
  args.push('-i', options.inputSpec);
  args.push('-g', 'typescript-angular');
  args.push('-o', options.outputPath);

  for (const [optionKey, flagConfig] of Object.entries(OPTION_FLAG_MAP) as [
    keyof OpenApiGeneratorOptions,
    FlagConfig | string
  ][]) {
    const value = options[optionKey];
    
    // Skip undefined, null, false, or empty string values
    if (value === undefined || value === null || value === false || value === '') {
      continue;
    }
    
    const config = typeof flagConfig === 'string' 
      ? { flag: flagConfig, requiresQuotes: false } 
      : flagConfig;
    
    // Handle boolean flags
    if (typeof value === 'boolean' && value === true) {
      args.push(config.flag);
    } 
    // Handle string values
    else if (typeof value === 'string') {
      args.push(config.flag, value);
    }
    // Handle unexpected types with better error reporting
    else if (value !== undefined) {
      console.warn(`Unexpected value type for option ${optionKey}: ${typeof value}`);
    }
  }

  // Handle global properties
  if (options.globalProperties && typeof options.globalProperties === 'object') {
    for (const [key, value] of Object.entries(options.globalProperties)) {
      if (key && value) {
        args.push('--global-property', `${key}=${value}`);
      } else {
        console.warn(`Skipping invalid global property: key="${key}", value="${value}"`);
      }
    }
  }

  return args;
}
