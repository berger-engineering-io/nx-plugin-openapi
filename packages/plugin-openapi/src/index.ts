/**
 * @nx-plugin-openapi/plugin-openapi
 * 
 * OpenAPI Tools generator plugin for the nx-plugin-openapi ecosystem.
 * This package provides a generator plugin implementation using the OpenAPI Tools CLI.
 */

// Main generator plugin
export { OpenApiToolsGenerator, createOpenApiToolsGenerator } from './lib/openapi-tools-generator';

// Schema and types
export type { 
  OpenApiToolsGeneratorOptions, 
  OpenApiToolsGeneratorSchema 
} from './lib/schema';
export { OPENAPI_TOOLS_GENERATOR_SCHEMA } from './lib/schema';

// Legacy exports (to maintain compatibility)
export * from './lib/plugin-openapi';

// Default export
export { createOpenApiToolsGenerator as default } from './lib/openapi-tools-generator';
