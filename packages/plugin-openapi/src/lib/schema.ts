/**
 * Schema definitions for the OpenAPI Tools Generator Plugin
 * 
 * This module exports TypeScript interfaces and JSON schemas
 * for validating plugin options and configuration.
 */

import type { GeneratorOptions } from '@nx-plugin-openapi/core';

/**
 * OpenAPI Tools Generator Options interface
 * Defines all available options for the OpenAPI Tools generator plugin
 */
export interface OpenApiToolsGeneratorOptions extends GeneratorOptions {
  /**
   * OpenAPI specification file path or object mapping service names to spec paths
   * - String: Path to a single OpenAPI specification file
   * - Object: Key-value pairs where key is service name and value is spec path
   */
  readonly inputSpec: string | Record<string, string>;

  /**
   * Output directory for generated files
   * Relative to the workspace root
   */
  readonly outputPath: string;

  /**
   * Path to OpenAPI Generator configuration file
   */
  readonly configFile?: string;

  /**
   * OpenAPI Generator type to use
   * @default 'typescript-angular'
   */
  readonly generator?: string;

  /**
   * Skip validation of the input OpenAPI specification
   * @default false
   */
  readonly skipValidateSpec?: boolean;

  /**
   * Authorization header for accessing the OpenAPI spec
   * Format: "Authorization: Bearer token" or "Authorization: Basic base64"
   */
  readonly auth?: string;

  /**
   * Suffix to append to API class names
   */
  readonly apiNameSuffix?: string;

  /**
   * Package name for generated API classes
   */
  readonly apiPackage?: string;

  /**
   * Artifact ID for generated code (used in package metadata)
   */
  readonly artifactId?: string;

  /**
   * Version of the generated artifact
   */
  readonly artifactVersion?: string;

  /**
   * Perform a dry run without actually generating files
   * @default false
   */
  readonly dryRun?: boolean;

  /**
   * Enable post-processing of generated files
   * @default false
   */
  readonly enablePostProcessFile?: boolean;

  /**
   * Git host URL for generated code metadata
   */
  readonly gitHost?: string;

  /**
   * Git repository ID for generated code metadata
   */
  readonly gitRepoId?: string;

  /**
   * Git user ID for generated code metadata
   */
  readonly gitUserId?: string;

  /**
   * Global properties to pass to the OpenAPI Generator
   * These are generator-specific configuration options
   */
  readonly globalProperties?: Record<string, string>;

  /**
   * Group ID for generated code (used in package metadata)
   */
  readonly groupId?: string;

  /**
   * HTTP user agent string for API requests
   */
  readonly httpUserAgent?: string;

  /**
   * Path to custom ignore file override
   */
  readonly ignoreFileOverride?: string;

  /**
   * Root directory for resolving relative input specification paths
   */
  readonly inputSpecRootDirectory?: string;

  /**
   * Package name for the HTTP client invoker
   */
  readonly invokerPackage?: string;

  /**
   * Log output to stderr instead of stdout
   * @default false
   */
  readonly logToStderr?: boolean;

  /**
   * Only update files that have changed (minimal update)
   * @default false
   */
  readonly minimalUpdate?: boolean;

  /**
   * Prefix to prepend to model class names
   */
  readonly modelNamePrefix?: string;

  /**
   * Suffix to append to model class names
   */
  readonly modelNameSuffix?: string;

  /**
   * Package name for generated model classes
   */
  readonly modelPackage?: string;

  /**
   * Package name for the entire generated library
   */
  readonly packageName?: string;

  /**
   * Release note text to include in generated code
   */
  readonly releaseNote?: string;

  /**
   * Remove prefix from operation IDs when generating method names
   * @default false
   */
  readonly removeOperationIdPrefix?: boolean;

  /**
   * Skip overwriting existing files
   * @default false
   */
  readonly skipOverwrite?: boolean;

  /**
   * Skip generation of operation examples
   * @default false
   */
  readonly skipOperationExample?: boolean;

  /**
   * Enable strict parsing of the OpenAPI specification
   * @default false
   */
  readonly strictSpec?: boolean;

  /**
   * Directory containing custom Mustache templates
   */
  readonly templateDirectory?: string;
}

/**
 * JSON Schema for OpenAPI Tools Generator Options
 * Used for runtime validation and IDE support
 */
export const OPENAPI_TOOLS_GENERATOR_SCHEMA = {
  $schema: 'http://json-schema.org/schema#',
  type: 'object',
  title: 'OpenAPI Tools Generator Options',
  description: 'Configuration options for the OpenAPI Tools generator plugin',
  properties: {
    inputSpec: {
      oneOf: [
        {
          type: 'string',
          description: 'Path to a single OpenAPI specification file',
          minLength: 1
        },
        {
          type: 'object',
          description: 'Object mapping service names to OpenAPI specification paths',
          additionalProperties: {
            type: 'string',
            minLength: 1
          },
          minProperties: 1
        }
      ],
      description: 'OpenAPI specification file path or object mapping service names to spec paths'
    },
    outputPath: {
      type: 'string',
      description: 'Output directory for generated files (relative to workspace root)',
      minLength: 1
    },
    configFile: {
      type: 'string',
      description: 'Path to OpenAPI Generator configuration file'
    },
    generator: {
      type: 'string',
      description: 'OpenAPI Generator type to use',
      default: 'typescript-angular',
      examples: [
        'typescript-angular',
        'typescript-axios',
        'typescript-fetch',
        'typescript-node',
        'javascript',
        'java',
        'python',
        'go'
      ]
    },
    skipValidateSpec: {
      type: 'boolean',
      description: 'Skip validation of the input OpenAPI specification',
      default: false
    },
    auth: {
      type: 'string',
      description: 'Authorization header for accessing the OpenAPI spec',
      examples: [
        'Authorization: Bearer token',
        'Authorization: Basic base64encoded'
      ]
    },
    apiNameSuffix: {
      type: 'string',
      description: 'Suffix to append to API class names',
      examples: ['Api', 'Service', 'Client']
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
      description: 'Version of the generated artifact',
      pattern: '^\\d+\\.\\d+\\.\\d+(-.*)?$'
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
      description: 'Git host URL for generated code metadata',
      format: 'uri'
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
      description: 'Global properties to pass to the OpenAPI Generator',
      additionalProperties: {
        type: 'string'
      },
      examples: [
        {
          'npmName': 'my-api-client',
          'npmVersion': '1.0.0',
          'withInterfaces': 'true'
        }
      ]
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
  required: ['inputSpec', 'outputPath'],
  additionalProperties: false
} as const;

/**
 * Type definition for the schema
 */
export type OpenApiToolsGeneratorSchema = typeof OPENAPI_TOOLS_GENERATOR_SCHEMA;