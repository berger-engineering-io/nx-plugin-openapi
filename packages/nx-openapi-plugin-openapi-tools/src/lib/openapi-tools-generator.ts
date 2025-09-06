import { rmSync } from 'fs';
import { join } from 'path';
import { BaseGenerator, GeneratorOptions, GeneratorContext, GeneratorResult, GeneratorSchema, buildCommandArgs, GenerateApiExecutorSchema } from '@lambda-solutions/nx-plugin-openapi';
import { OpenAPIToolsGeneratorOptions, openAPIToolsGeneratorSchema } from './schema';

/**
 * OpenAPI Tools Generator - provides backward compatibility with the existing executor
 * This generator uses the OpenAPI Generator CLI to generate API client code
 */
export class OpenAPIToolsGenerator extends BaseGenerator {
  public readonly name = 'openapi-tools';
  public readonly displayName = 'OpenAPI Generator CLI';
  public readonly packageName = '@openapitools/openapi-generator-cli';

  /**
   * Generate API client code using OpenAPI Generator CLI
   */
  public async generate(options: GeneratorOptions, context: GeneratorContext): Promise<GeneratorResult> {
    const operationName = 'OpenAPI Tools Generation';
    
    try {
      // Validate options
      this.validateOptionsOrThrow(options);

      const { inputSpec, outputPath } = options;

      // Check if inputSpec is a string or object (single vs multiple specs)
      if (typeof inputSpec === 'string') {
        // Single spec - maintain existing behavior
        this.logInfo('Starting to generate API from provided OpenAPI spec...');
        this.logVerbose(`Cleaning outputPath ${outputPath} first`);

        // Clean the output directory before generating
        const fullOutputPath = join(context.root, outputPath);
        rmSync(fullOutputPath, { recursive: true, force: true });

        // Build command arguments using existing utility
        const executorOptions = this.convertToExecutorOptions(options);
        const args = buildCommandArgs(executorOptions);

        // Execute OpenAPI Generator
        await this.executeOpenApiGenerator(args, context);

        this.logInfo('API generation completed successfully.');

        return this.createSuccessResult([outputPath]);
      } else {
        // Multiple specs - generate each in a subdirectory
        this.logInfo('Starting to generate APIs from multiple OpenAPI specs...');
        
        const specEntries = Object.entries(inputSpec);
        const generatedFiles: string[] = [];
        
        for (const [serviceName, specPath] of specEntries) {
          this.logInfo(`Generating API for ${serviceName}...`);
          
          // Create service-specific output path
          const serviceOutputPath = join(outputPath, serviceName);
          const fullServiceOutputPath = join(context.root, serviceOutputPath);
          
          // Clean the service-specific output directory
          this.logVerbose(`Cleaning outputPath ${serviceOutputPath} first`);
          rmSync(fullServiceOutputPath, { recursive: true, force: true });
          
          // Create options for this specific service
          const serviceOptions = {
            ...options,
            inputSpec: specPath,
            outputPath: serviceOutputPath
          };
          
          // Build command arguments using existing utility
          const executorOptions = this.convertToExecutorOptions(serviceOptions);
          const args = buildCommandArgs(executorOptions);
          
          // Execute OpenAPI Generator for this service
          await this.executeOpenApiGenerator(args, context);
          
          this.logInfo(`API generation for ${serviceName} completed successfully.`);
          generatedFiles.push(serviceOutputPath);
        }
        
        this.logInfo('All API generations completed successfully.');

        return this.createSuccessResult(generatedFiles);
      }
    } catch (error) {
      return this.handleGenerationError(error, operationName);
    }
  }

  /**
   * Get supported generator types/languages
   * Currently hardcoded to typescript-angular as in the original implementation
   */
  public getSupportedTypes(): string[] {
    return ['typescript-angular'];
  }

  /**
   * Get the JSON schema for OpenAPI Tools generator options
   */
  public getSchema(): GeneratorSchema {
    return openAPIToolsGeneratorSchema;
  }

  /**
   * Execute OpenAPI Generator CLI command
   * This maintains the exact same logic as the original executor
   */
  private async executeOpenApiGenerator(args: string[], context: GeneratorContext): Promise<void> {
    const result = await this.executeCommand(
      'node',
      ['node_modules/@openapitools/openapi-generator-cli/main.js', ...args],
      {
        cwd: context.root,
        stdio: 'inherit'
      }
    );

    if (result.exitCode !== 0) {
      throw new Error(`OpenAPI Generator exited with code ${result.exitCode}`);
    }
  }

  /**
   * Convert GeneratorOptions to GenerateApiExecutorSchema for backward compatibility
   * This ensures we can reuse the existing buildCommandArgs utility
   */
  private convertToExecutorOptions(options: GeneratorOptions): GenerateApiExecutorSchema {
    return {
      inputSpec: options.inputSpec,
      outputPath: options.outputPath,
      configFile: options.configFile,
      skipValidateSpec: options.skipValidateSpec,
      auth: options.auth,
      apiNameSuffix: options.apiNameSuffix,
      apiPackage: options.apiPackage,
      artifactId: options.artifactId,
      artifactVersion: options.artifactVersion,
      dryRun: options.dryRun,
      enablePostProcessFile: options.enablePostProcessFile,
      gitHost: options.gitHost,
      gitRepoId: options.gitRepoId,
      gitUserId: options.gitUserId,
      globalProperties: options.globalProperties,
      groupId: options.groupId,
      httpUserAgent: options.httpUserAgent,
      ignoreFileOverride: options.ignoreFileOverride,
      inputSpecRootDirectory: options.inputSpecRootDirectory,
      invokerPackage: options.invokerPackage,
      logToStderr: options.logToStderr,
      minimalUpdate: options.minimalUpdate,
      modelNamePrefix: options.modelNamePrefix,
      modelNameSuffix: options.modelNameSuffix,
      modelPackage: options.modelPackage,
      packageName: options.packageName,
      releaseNote: options.releaseNote,
      removeOperationIdPrefix: options.removeOperationIdPrefix,
      skipOverwrite: options.skipOverwrite,
      skipOperationExample: options.skipOperationExample,
      strictSpec: options.strictSpec,
      templateDirectory: options.templateDirectory,
    };
  }

  /**
   * Additional custom validation for OpenAPI Tools specific options
   */
  protected override validateCustomOptions(options: GeneratorOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Add any OpenAPI Tools specific validation here if needed
    // For now, we rely on the base validation which covers the required fields
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}