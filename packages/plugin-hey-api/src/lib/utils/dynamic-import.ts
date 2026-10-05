/**
 * Native dynamic `import()` that survives compilation to CommonJS.
 *
 * With `module: commonjs`, TypeScript rewrites `await import('x')` to
 * `require('x')`, which fails for ESM-only packages such as
 * `@hey-api/openapi-ts` >= 0.9x (`exports` only has an `import` condition).
 * Creating the call via `new Function` hides it from the compiler, so Node
 * performs a real ESM import. CJS packages still load: Node exposes their
 * `module.exports` as the `default` export.
 */
export const dynamicImport = new Function(
  'specifier',
  'return import(specifier)'
) as <T = Record<string, unknown>>(specifier: string) => Promise<T>;
