/**
 * OpenAPI Tools Generator Plugin
 * 
 * This plugin provides OpenAPI code generation functionality using the OpenAPI Tools CLI.
 * It extends the BaseGenerator from @nx-plugin-openapi/core and implements the GeneratorPlugin interface.
 */

import { BaseGenerator } from '@nx-plugin-openapi/core';
import type {
  GeneratorOptions,
  GeneratorContext,
  GeneratorResult,
  GeneratorSchema,
  ValidationError,
} from '@nx-plugin-openapi/core';
import { spawn } from 'child_process';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import { OpenApiToolsGeneratorOptions, OPENAPI_TOOLS_GENERATOR_SCHEMA } from './schema';

interface FlagConfig {
  flag: string;
  requiresQuotes?: boolean;
}

type OptionFlagMap = {
  [K in keyof OpenApiToolsGeneratorOptions]?: FlagConfig | string;
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

/**
 * OpenAPI Tools Generator Plugin
 */
export class OpenApiToolsGenerator extends BaseGenerator {
  public readonly name = 'openapi-tools';
  public readonly version = '1.0.0';
  public override readonly description = 'Generate API clients and types from OpenAPI specifications using OpenAPI Tools CLI';
  public readonly supportedFileTypes = ['yaml', 'yml', 'json'] as const;
  public readonly requiredOptions = ['inputSpec', 'outputPath'] as const;

  constructor() {
    super({
      description: 'Generate API clients and types from OpenAPI specifications using OpenAPI Tools CLI'
    });
  }

  /**
   * Generate API code from OpenAPI specifications
   */
  async generate(options: GeneratorOptions, context: GeneratorContext): Promise<GeneratorResult> {
    const typedOptions = options as OpenApiToolsGeneratorOptions;

    try {
      // Validate options first
      this.validateBaseOptions(typedOptions);

      const generatedFiles: string[] = [];

      // Check if inputSpec is a string or object
      if (typeof typedOptions.inputSpec === 'string') {
        // Single spec - maintain existing behavior
        context.logger.info('Starting to generate API from provided OpenAPI spec...');
        
        const files = await this.generateSingleSpec(typedOptions, context);
        generatedFiles.push(...files);
        
        context.logger.info('API generation completed successfully.');
      } else {
        // Multiple specs - generate each in a subdirectory
        context.logger.info('Starting to generate APIs from multiple OpenAPI specs...');
        
        const specEntries = Object.entries(typedOptions.inputSpec);
        
        for (const [serviceName, specPath] of specEntries) {
          context.logger.info(`Generating API for ${serviceName}...`);
          
          // Create service-specific output path
          const serviceOutputPath = join(typedOptions.outputPath, serviceName);
          
          // Type guard to ensure specPath is a string
          if (typeof specPath !== 'string') {
            throw new Error(`Spec path for service '${serviceName}' must be a string, got ${typeof specPath}`);
          }
          
          // Create options for this specific service
          const serviceOptions: OpenApiToolsGeneratorOptions = {
            ...typedOptions,
            inputSpec: specPath,
            outputPath: serviceOutputPath
          };
          
          const files = await this.generateSingleSpec(serviceOptions, context);
          generatedFiles.push(...files);
          
          context.logger.info(`API generation for ${serviceName} completed successfully.`);
        }
        
        context.logger.info('All API generations completed successfully.');
      }

      return this.createSuccessResult({
        message: 'API generation completed successfully',
        generatedFiles
      });

    } catch (error) {
      context.logger.error('API generation failed with error');
      if (error instanceof Error) {
        context.logger.error(error.message);
      }
      
      return this.createFailedResult({
        message: `API generation failed: ${error instanceof Error ? error.message : String(error)}`,
        errors: [error instanceof Error ? error.message : String(error)]
      });
    }
  }

  /**
   * Generate API code from a single OpenAPI specification
   */
  private async generateSingleSpec(
    options: OpenApiToolsGeneratorOptions,
    context: GeneratorContext
  ): Promise<string[]> {
    const { outputPath } = options;
    
    context.logger.debug(`Cleaning outputPath ${outputPath} first`);

    // Clean the output directory before generating
    const fullOutputPath = join(context.workspaceRoot, outputPath);
    if (existsSync(fullOutputPath)) {
      rmSync(fullOutputPath, { recursive: true, force: true });
    }

    // Build command arguments
    const args = this.buildCommandArgs(options);
    context.logger.debug(`OpenAPI Generator command: openapi-generator-cli ${args.join(' ')}`);

    // Execute OpenAPI Generator
    await this.executeOpenApiGenerator(args, context);

    // Return the list of generated files (simplified - in a real implementation, 
    // you might want to scan the output directory to get the actual files)
    return [fullOutputPath];
  }

  /**
   * Execute the OpenAPI Generator CLI
   */
  private async executeOpenApiGenerator(args: string[], context: GeneratorContext): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const childProcess = spawn(
        'node',
        ['node_modules/@openapitools/openapi-generator-cli/main.js', ...args],
        {
          cwd: context.workspaceRoot,
          stdio: 'inherit',
        }
      );

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`OpenAPI Generator exited with code ${code}`));
        }
      });

      childProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Build command line arguments for OpenAPI Generator CLI
   */
  private buildCommandArgs(options: OpenApiToolsGeneratorOptions): string[] {
    const args: string[] = [];

    // Add base command arguments
    args.push('generate');
    args.push('-i', typeof options.inputSpec === 'string' ? options.inputSpec : '');
    args.push('-g', options.generator || 'typescript-angular');
    args.push('-o', options.outputPath);

    // Handle regular options
    for (const [optionKey, flagConfig] of Object.entries(OPTION_FLAG_MAP)) {
      const value = options[optionKey as keyof OpenApiToolsGeneratorOptions];

      if (
        value === undefined ||
        value === null ||
        value === false ||
        value === '' ||
        flagConfig === undefined
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

  /**
   * Get the JSON schema for the generator's options
   */
  async getSchema(): Promise<GeneratorSchema> {
    // Convert the const schema to a proper GeneratorSchema
    const schema: GeneratorSchema = {
      $schema: OPENAPI_TOOLS_GENERATOR_SCHEMA.$schema,
      type: 'object',
      properties: {
        // Convert inputSpec property to a simple string type for the interface
        inputSpec: {
          type: 'string',
          description: 'OpenAPI specification file path or object mapping service names to spec paths'
        },
        outputPath: {
          type: 'string',
          description: 'Output directory for generated files (relative to workspace root)'
        },
        configFile: {
          type: 'string',
          description: 'Path to OpenAPI Generator configuration file'
        },
        generator: {
          type: 'string',
          description: 'OpenAPI Generator type to use',
          default: 'typescript-angular'
        },
        skipValidateSpec: {
          type: 'boolean',
          description: 'Skip validation of the input OpenAPI specification',
          default: false
        },
        auth: {
          type: 'string',
          description: 'Authorization header for accessing the OpenAPI spec'
        },
        apiNameSuffix: {
          type: 'string',
          description: 'Suffix to append to API class names'
        },
        apiPackage: {
          type: 'string',
          description: 'Package name for generated API classes'
        },
        artifactId: {
          type: 'string',
          description: 'Artifact ID for generated code (used in package metadata)'
        },
        artifactVersion: {
          type: 'string',
          description: 'Version of the generated artifact'
        },
        dryRun: {
          type: 'boolean',
          description: 'Perform a dry run without actually generating files',
          default: false
        },
        enablePostProcessFile: {
          type: 'boolean',
          description: 'Enable post-processing of generated files',
          default: false
        },
        gitHost: {
          type: 'string',
          description: 'Git host URL for generated code metadata'
        },
        gitRepoId: {
          type: 'string',
          description: 'Git repository ID for generated code metadata'
        },
        gitUserId: {
          type: 'string',
          description: 'Git user ID for generated code metadata'
        },
        globalProperties: {
          type: 'object',
          description: 'Global properties to pass to the OpenAPI Generator'
        },
        groupId: {
          type: 'string',
          description: 'Group ID for generated code (used in package metadata)'
        },
        httpUserAgent: {
          type: 'string',
          description: 'HTTP user agent string for API requests'
        },
        ignoreFileOverride: {
          type: 'string',
          description: 'Path to custom ignore file override'
        },
        inputSpecRootDirectory: {
          type: 'string',
          description: 'Root directory for resolving relative input specification paths'
        },
        invokerPackage: {
          type: 'string',
          description: 'Package name for the HTTP client invoker'
        },
        logToStderr: {
          type: 'boolean',
          description: 'Log output to stderr instead of stdout',
          default: false
        },
        minimalUpdate: {
          type: 'boolean',
          description: 'Only update files that have changed (minimal update)',
          default: false
        },
        modelNamePrefix: {
          type: 'string',
          description: 'Prefix to prepend to model class names'
        },
        modelNameSuffix: {
          type: 'string',
          description: 'Suffix to append to model class names'
        },
        modelPackage: {
          type: 'string',
          description: 'Package name for generated model classes'
        },
        packageName: {
          type: 'string',
          description: 'Package name for the entire generated library'
        },
        releaseNote: {
          type: 'string',
          description: 'Release note text to include in generated code'
        },
        removeOperationIdPrefix: {
          type: 'boolean',
          description: 'Remove prefix from operation IDs when generating method names',
          default: false
        },
        skipOverwrite: {
          type: 'boolean',
          description: 'Skip overwriting existing files',
          default: false
        },
        skipOperationExample: {
          type: 'boolean',
          description: 'Skip generation of operation examples',
          default: false
        },
        strictSpec: {
          type: 'boolean',
          description: 'Enable strict parsing of the OpenAPI specification',
          default: false
        },
        templateDirectory: {
          type: 'string',
          description: 'Directory containing custom Mustache templates'
        }
      },
      required: OPENAPI_TOOLS_GENERATOR_SCHEMA.required,
      additionalProperties: OPENAPI_TOOLS_GENERATOR_SCHEMA.additionalProperties
    };
    
    return schema;
  }

  /**
   * Custom validation for OpenAPI Tools specific options
   */
  protected override async customValidation(options: GeneratorOptions): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const typedOptions = options as OpenApiToolsGeneratorOptions;

    // Validate inputSpec format
    if (typeof typedOptions.inputSpec !== 'string' && 
        (typeof typedOptions.inputSpec !== 'object' || Array.isArray(typedOptions.inputSpec))) {
      errors.push({
        property: 'inputSpec',
        message: 'inputSpec must be a string path or an object mapping service names to spec paths',
        code: 'INVALID_INPUT_SPEC_FORMAT'
      });
    }

    // Validate generator type if specified
    if (typedOptions.generator && typeof typedOptions.generator !== 'string') {
      errors.push({
        property: 'generator',
        message: 'generator must be a string',
        code: 'INVALID_GENERATOR_TYPE'
      });
    }

    // Validate globalProperties if specified
    if (typedOptions.globalProperties && 
        (typeof typedOptions.globalProperties !== 'object' || Array.isArray(typedOptions.globalProperties))) {
      errors.push({
        property: 'globalProperties',
        message: 'globalProperties must be an object with string keys and values',
        code: 'INVALID_GLOBAL_PROPERTIES_FORMAT'
      });
    }

    return errors;
  }
}

/**
 * Plugin factory function
 * Creates and returns a new instance of the OpenAPI Tools generator
 */
export function createOpenApiToolsGenerator(): OpenApiToolsGenerator {
  return new OpenApiToolsGenerator();
}

/**
 * Default export for the plugin factory
 */
export default createOpenApiToolsGenerator;