/**
 * Command builder for OpenAPI Tools generator
 * Builds command line arguments for the OpenAPI Generator CLI
 */
export class OpenAPIToolsCommandBuilder {
  private flagMap: Record<string, { flag: string; requiresQuotes?: boolean }> = {
    configFile: { flag: '-c' },
    skipValidateSpec: { flag: '--skip-validate-spec' },
    auth: { flag: '--auth' },
    apiNameSuffix: { flag: '--api-name-suffix' },
    apiPackage: { flag: '--api-package' },
    artifactId: { flag: '--artifact-id' },
    artifactVersion: { flag: '--artifact-version' },
    dryRun: { flag: '--dry-run' },
    enablePostProcessFile: { flag: '--enable-post-process-file' },
    gitHost: { flag: '--git-host' },
    gitRepoId: { flag: '--git-repo-id' },
    gitUserId: { flag: '--git-user-id' },
    groupId: { flag: '--group-id' },
    httpUserAgent: { flag: '--http-user-agent', requiresQuotes: true },
    ignoreFileOverride: { flag: '--ignore-file-override' },
    inputSpecRootDirectory: { flag: '--input-spec-root-directory' },
    invokerPackage: { flag: '--invoker-package' },
    logToStderr: { flag: '--log-to-stderr' },
    minimalUpdate: { flag: '--minimal-update' },
    modelNamePrefix: { flag: '--model-name-prefix' },
    modelNameSuffix: { flag: '--model-name-suffix' },
    modelPackage: { flag: '--model-package' },
    packageName: { flag: '--package-name' },
    releaseNote: { flag: '--release-note', requiresQuotes: true },
    removeOperationIdPrefix: { flag: '--remove-operation-id-prefix' },
    skipOverwrite: { flag: '--skip-overwrite' },
    skipOperationExample: { flag: '--skip-operation-example' },
    strictSpec: { flag: '--strict-spec' },
    templateDirectory: { flag: '--template-dir' },
  };

  /**
   * Build command arguments from options
   */
  buildArgs(options: Record<string, any>): string[] {
    const args: string[] = [];

    // Add base command
    args.push('generate');

    // Add required options
    args.push('-i', options.inputSpec);
    args.push('-g', options.generatorType || 'typescript-angular');
    args.push('-o', options.outputPath);

    // Process other options
    for (const [key, value] of Object.entries(options)) {
      // Skip already processed options
      if (key === 'inputSpec' || key === 'outputPath' || key === 'generatorType') {
        continue;
      }

      // Skip undefined, null, false, or empty values
      if (value === undefined || value === null || value === false || value === '') {
        continue;
      }

      // Handle global properties separately
      if (key === 'globalProperties' && typeof value === 'object') {
        this.addGlobalProperties(args, value);
        continue;
      }

      // Handle other flags
      const flagConfig = this.flagMap[key];
      if (flagConfig) {
        this.addFlag(args, flagConfig, value);
      }
    }

    return args;
  }

  /**
   * Add a flag to the arguments
   */
  private addFlag(
    args: string[],
    flagConfig: { flag: string; requiresQuotes?: boolean },
    value: any
  ): void {
    if (typeof value === 'boolean' && value === true) {
      // Boolean flag
      args.push(flagConfig.flag);
    } else if (typeof value === 'string' || typeof value === 'number') {
      // String or number value
      const stringValue = String(value);
      args.push(flagConfig.flag, stringValue);
    }
  }

  /**
   * Add global properties to arguments
   */
  private addGlobalProperties(
    args: string[],
    properties: Record<string, string>
  ): void {
    for (const [key, value] of Object.entries(properties)) {
      args.push('--global-property', `${key}=${value}`);
    }
  }

  /**
   * Build minimal arguments for validation
   */
  buildValidationArgs(inputSpec: string): string[] {
    return [
      'validate',
      '-i', inputSpec,
    ];
  }

  /**
   * Build arguments for listing available generators
   */
  buildListArgs(): string[] {
    return ['list'];
  }

  /**
   * Build arguments for getting generator config help
   */
  buildConfigHelpArgs(generatorType: string): string[] {
    return [
      'config-help',
      '-g', generatorType,
    ];
  }
}