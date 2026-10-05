export const OPENAPI_GENERATOR_CLI_ENTRY =
  '@openapitools/openapi-generator-cli/main.js';

/**
 * Resolves the openapi-generator-cli entry from the workspace root via Node
 * module resolution, so it works with pnpm, non-hoisted and nested installs.
 */
export function resolveOpenApiGeneratorCli(root: string): string {
  try {
    return require.resolve(OPENAPI_GENERATOR_CLI_ENTRY, { paths: [root] });
  } catch {
    throw new Error(
      `Could not resolve "${OPENAPI_GENERATOR_CLI_ENTRY}" from "${root}". ` +
        `Install it in your workspace: npm install -D @openapitools/openapi-generator-cli`
    );
  }
}
