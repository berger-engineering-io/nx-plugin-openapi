import { GeneratorSchema } from '@lambda-solutions/nx-plugin-openapi';

/**
 * OpenAPI Tools Generator schema options
 * This interface extends the existing GenerateApiExecutorSchema to maintain backward compatibility
 */
export interface OpenAPIToolsGeneratorOptions {
  inputSpec: string | Record<string, string>;
  outputPath: string;
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

/**
 * JSON Schema for OpenAPI Tools Generator options
 * Based on the existing schema.json from the executor
 */
export const openAPIToolsGeneratorSchema: GeneratorSchema = {
  type: 'object',
  title: 'OpenAPI Tools Generator',
  description: 'Generate API client code using OpenAPI Generator CLI from OpenAPI specifications',
  properties: {
    inputSpec: {
      oneOf: [
        {
          type: 'string',
          description: 'Path to the OpenAPI specification file'
        },
        {
          type: 'object',
          description: 'Multiple OpenAPI specification files mapped by service name',
          additionalProperties: {
            type: 'string'
          }
        }
      ],
      description: 'Path to the OpenAPI specification file(s). Can be a single path or an object mapping service names to paths'
    },
    outputPath: {
      type: 'string',
      description: 'Output directory for the generated API code'
    },
    configFile: {
      type: 'string',
      description: 'Path to a custom configuration file'
    },
    skipValidateSpec: {
      type: 'boolean',
      description: 'Whether to skip validation of the OpenAPI specification',
      default: false
    },
    auth: {
      type: 'string',
      description: 'Authentication configuration'
    },
    apiNameSuffix: {
      type: 'string',
      description: 'Suffix for API names'
    },
    apiPackage: {
      type: 'string',
      description: 'Package name for API classes'
    },
    artifactId: {
      type: 'string',
      description: 'Artifact ID for the generated code'
    },
    artifactVersion: {
      type: 'string',
      description: 'Version of the generated artifact'
    },
    dryRun: {
      type: 'boolean',
      description: 'Perform a dry run without generating files',
      default: false
    },
    enablePostProcessFile: {
      type: 'boolean',
      description: 'Enable post-processing of generated files',
      default: false
    },
    gitHost: {
      type: 'string',
      description: 'Git host for the repository'
    },
    gitRepoId: {
      type: 'string',
      description: 'Git repository ID'
    },
    gitUserId: {
      type: 'string',
      description: 'Git user ID'
    },
    globalProperties: {
      type: 'object',
      description: 'Global properties for code generation',
      additionalProperties: {
        type: 'string'
      }
    },
    groupId: {
      type: 'string',
      description: 'Group ID for the generated code'
    },
    httpUserAgent: {
      type: 'string',
      description: 'HTTP user agent string'
    },
    ignoreFileOverride: {
      type: 'string',
      description: 'Path to ignore file override'
    },
    inputSpecRootDirectory: {
      type: 'string',
      description: 'Root directory for input specifications'
    },
    invokerPackage: {
      type: 'string',
      description: 'Package name for invoker classes'
    },
    logToStderr: {
      type: 'boolean',
      description: 'Log output to stderr',
      default: false
    },
    minimalUpdate: {
      type: 'boolean',
      description: 'Perform minimal updates only',
      default: false
    },
    modelNamePrefix: {
      type: 'string',
      description: 'Prefix for model names'
    },
    modelNameSuffix: {
      type: 'string',
      description: 'Suffix for model names'
    },
    modelPackage: {
      type: 'string',
      description: 'Package name for model classes'
    },
    packageName: {
      type: 'string',
      description: 'Package name for the generated code'
    },
    releaseNote: {
      type: 'string',
      description: 'Release notes for the generated code'
    },
    removeOperationIdPrefix: {
      type: 'boolean',
      description: 'Remove operation ID prefix',
      default: false
    },
    skipOverwrite: {
      type: 'boolean',
      description: 'Skip overwriting existing files',
      default: false
    },
    skipOperationExample: {
      type: 'boolean',
      description: 'Skip generating operation examples',
      default: false
    },
    strictSpec: {
      type: 'boolean',
      description: 'Use strict specification validation',
      default: false
    },
    templateDirectory: {
      type: 'string',
      description: 'Directory containing custom templates'
    }
  },
  required: ['inputSpec', 'outputPath'],
  additionalProperties: false
};