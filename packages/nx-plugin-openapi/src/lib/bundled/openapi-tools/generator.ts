import { spawn } from 'child_process';
import { BaseGenerator } from '../../core/base-generator';
import {
  GeneratorOptions,
  GeneratorResult,
  GeneratorSchema,
} from '../../core/interfaces';
import { GeneratorExecutionError } from '../../core/errors';
import { OpenAPIToolsCommandBuilder } from './command-builder';

/**
 * Bundled OpenAPI Tools generator for backward compatibility
 * This is the default generator that matches the current implementation
 */
export class OpenAPIToolsGenerator extends BaseGenerator {
  readonly name = 'openapi-tools';
  readonly displayName = 'OpenAPI Generator CLI';
  readonly description = 'Official OpenAPI Generator with support for 50+ languages/frameworks';
  readonly packageName = '@openapitools/openapi-generator-cli';
  readonly minVersion = '2.0.0';

  /**
   * Check if OpenAPI Generator CLI is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      require.resolve('@openapitools/openapi-generator-cli/main.js', {
        paths: [process.cwd()],
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the configuration schema
   */
  getSchema(): GeneratorSchema {
    return {
      type: 'object',
      properties: {
        generatorType: {
          type: 'string',
          description: 'The type of generator to use',
          default: 'typescript-angular',
          enum: this.getSupportedTypes(),
        },
        configFile: {
          type: 'string',
          description: 'Path to a custom configuration file',
        },
        skipValidateSpec: {
          type: 'boolean',
          description: 'Whether to skip validation of the OpenAPI specification',
          default: false,
        },
        auth: {
          type: 'string',
          description: 'Authentication configuration',
        },
        apiNameSuffix: {
          type: 'string',
          description: 'Suffix for API names',
        },
        apiPackage: {
          type: 'string',
          description: 'Package name for API classes',
        },
        artifactId: {
          type: 'string',
          description: 'Artifact ID for the generated code',
        },
        artifactVersion: {
          type: 'string',
          description: 'Version of the generated artifact',
        },
        dryRun: {
          type: 'boolean',
          description: 'Perform a dry run without generating files',
          default: false,
        },
        enablePostProcessFile: {
          type: 'boolean',
          description: 'Enable post-processing of generated files',
          default: false,
        },
        gitHost: {
          type: 'string',
          description: 'Git host for the repository',
        },
        gitRepoId: {
          type: 'string',
          description: 'Git repository ID',
        },
        gitUserId: {
          type: 'string',
          description: 'Git user ID',
        },
        groupId: {
          type: 'string',
          description: 'Group ID for the generated code',
        },
        httpUserAgent: {
          type: 'string',
          description: 'HTTP user agent string',
        },
        ignoreFileOverride: {
          type: 'string',
          description: 'Path to ignore file override',
        },
        inputSpecRootDirectory: {
          type: 'string',
          description: 'Root directory for input specifications',
        },
        invokerPackage: {
          type: 'string',
          description: 'Package name for invoker classes',
        },
        logToStderr: {
          type: 'boolean',
          description: 'Log output to stderr',
          default: false,
        },
        minimalUpdate: {
          type: 'boolean',
          description: 'Perform minimal updates only',
          default: false,
        },
        modelNamePrefix: {
          type: 'string',
          description: 'Prefix for model names',
        },
        modelNameSuffix: {
          type: 'string',
          description: 'Suffix for model names',
        },
        modelPackage: {
          type: 'string',
          description: 'Package name for model classes',
        },
        packageName: {
          type: 'string',
          description: 'Package name for the generated code',
        },
        releaseNote: {
          type: 'string',
          description: 'Release notes for the generated code',
        },
        removeOperationIdPrefix: {
          type: 'boolean',
          description: 'Remove operation ID prefix',
          default: false,
        },
        skipOverwrite: {
          type: 'boolean',
          description: 'Skip overwriting existing files',
          default: false,
        },
        skipOperationExample: {
          type: 'boolean',
          description: 'Skip generating operation examples',
          default: false,
        },
        strictSpec: {
          type: 'boolean',
          description: 'Use strict specification validation',
          default: false,
        },
        templateDirectory: {
          type: 'string',
          description: 'Directory containing custom templates',
        },
      },
      required: [],
    };
  }

  /**
   * Generate code from OpenAPI spec
   */
  async generate(options: GeneratorOptions): Promise<GeneratorResult> {
    const { inputSpec, outputPath, generatorType, context, rawOptions } = options;

    // Check if generator is available
    if (!(await this.isAvailable())) {
      return {
        success: false,
        error: new Error(
          `OpenAPI Generator CLI is not installed. Please run: npm install --save-dev ${this.packageName}`
        ),
      };
    }

    this.log(`Generating API from ${inputSpec} to ${outputPath}`);

    try {
      // Build command arguments
      const commandBuilder = new OpenAPIToolsCommandBuilder();
      const args = commandBuilder.buildArgs({
        inputSpec,
        outputPath,
        generatorType: generatorType || 'typescript-angular',
        ...rawOptions,
      });

      // Execute OpenAPI Generator
      await this.executeGenerator(args, context.root);

      this.log('API generation completed successfully');

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Execute the OpenAPI Generator CLI
   */
  private async executeGenerator(args: string[], cwd: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const childProcess = spawn(
        'node',
        ['node_modules/@openapitools/openapi-generator-cli/main.js', ...args],
        {
          cwd,
          stdio: 'inherit',
        }
      );

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new GeneratorExecutionError(
              this.name,
              `OpenAPI Generator exited with code ${code}`,
            )
          );
        }
      });

      childProcess.on('error', (error) => {
        reject(
          new GeneratorExecutionError(
            this.name,
            `Failed to spawn OpenAPI Generator process`,
            error
          )
        );
      });
    });
  }

  /**
   * Get supported generator types
   */
  getSupportedTypes(): string[] {
    return [
      'typescript-angular',
      'typescript-axios',
      'typescript-fetch',
      'typescript-node',
      'typescript-rxjs',
      'typescript-inversify',
      'javascript',
      'javascript-apollo-deprecated',
      'javascript-flowtyped',
      'javascript-closure-angular',
      'java',
      'jaxrs-cxf',
      'jaxrs-cxf-cdi',
      'jaxrs-cxf-extended',
      'jaxrs-jersey',
      'jaxrs-resteasy',
      'jaxrs-resteasy-eap',
      'jaxrs-spec',
      'kotlin',
      'kotlin-spring',
      'kotlin-vertx',
      'kotlin-jvm-vertx',
      'kotlin-jvm-volley',
      'kotlin-multiplatform',
      'python',
      'python-fastapi',
      'python-flask',
      'python-aiohttp',
      'python-blueplanet',
      'python-experimental',
      'python-prior',
      'ruby',
      'ruby-on-rails',
      'ruby-sinatra',
      'rust',
      'rust-server',
      'scala-akka',
      'scala-akka-http-server',
      'scala-finch',
      'scala-gatling',
      'scala-lagom-server',
      'scala-play-server',
      'scala-scalaz',
      'scala-sttp',
      'scala-sttp4',
      'scalaz',
      'go',
      'go-echo-server',
      'go-gin-server',
      'go-server',
      'graphql-nodejs-express-server',
      'csharp',
      'csharp-netcore',
      'csharp-dotnet2',
      'csharp-functions',
      'asp-dotnet-core',
      'avro-schema',
      'crystal',
      'c',
      'cpp-qt-client',
      'cpp-qt-qhttpengine-server',
      'cpp-pistache-server',
      'cpp-restbed-server',
      'cpp-restsdk',
      'cpp-tiny',
      'cpp-tizen',
      'cpp-ue4',
      'dart',
      'dart-dio',
      'dart-dio-next',
      'dart-jaguar',
      'eiffel',
      'elixir',
      'elm',
      'erlang-client',
      'erlang-proper',
      'erlang-server',
      'fsharp-functions',
      'fsharp-giraffe-server',
      'groovy',
      'haskell',
      'haskell-http-client',
      'haskell-yesod',
      'julia-client',
      'julia-server',
      'ktorm-schema',
      'lua',
      'markdown',
      'mysql-schema',
      'nim',
      'nodejs-express-server',
      'objc',
      'ocaml',
      'openapi',
      'openapi-yaml',
      'perl',
      'php',
      'php-dt',
      'php-laravel',
      'php-lumen',
      'php-mezzio-ph',
      'php-slim4',
      'php-symfony',
      'php-ze-ph',
      'plantuml',
      'powershell',
      'protobuf-schema',
      'r',
      'spring',
      'dynamic-html',
      'html',
      'html2',
      'apache2',
      'apex',
      'bash',
      'confluence-wiki',
      'asciidoc',
      'ada',
      'ada-server',
      'android',
      'clojure',
      'cwiki',
      'wsdl-schema',
    ];
  }

  /**
   * Get required dependencies
   */
  getDependencies(): string[] {
    return ['@openapitools/openapi-generator-cli@^2.20.0'];
  }
}