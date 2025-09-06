/**
 * nx-plugin-openapi - OpenAPI Generator Plugin for Nx
 * 
 * This package provides generators and executors for generating API client code
 * from OpenAPI specifications in Nx workspaces.
 */

// Core functionality
export * from './lib/core';

// Bundled generators for backward compatibility
export * from './lib/bundled';

// Executor utilities for external plugins
export { buildCommandArgs } from './executors/generate-api/utils/build-command';
export { GenerateApiExecutorSchema } from './executors/generate-api/schema';