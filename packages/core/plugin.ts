// Nx plugin entry point: `{ "plugin": "@nx-plugin-openapi/core/plugin" }` in nx.json
export { createNodesV2 } from './src/plugin/create-nodes';
export type { OpenApiPluginOptions } from './src/plugin/create-nodes';
export type { ClientDefinition } from './src/plugin/client-definition';
