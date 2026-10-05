import { createModuleExportsResolver } from './module-exports';

describe('createModuleExportsResolver', () => {
  const exportsOf = createModuleExportsResolver([
    {
      path: 'core/types.gen.ts',
      content: `export interface Config { a?: string }\nexport type HttpMethod = 'get';\n`,
    },
    {
      path: 'client/types.gen.ts',
      content: `import type { Config as CoreConfig } from '../core/types.gen';\nexport interface Config extends CoreConfig { b?: string }\n`,
    },
    {
      path: 'client/index.ts',
      content: `export type { Config } from './types.gen';\nexport * from '../core/types.gen';\nexport { external } from '@ext/pkg';\nexport const createClient = () => 1;\nexport default 42;\n`,
    },
    { path: 'script.ts', content: `const local = 1;\n` },
    { path: 'README.md', content: '# not code' },
  ]);

  it('lists named exports following export * and aliases', () => {
    const exports = exportsOf('client/index.ts');

    expect(exports.map((e) => e.name).sort()).toEqual([
      'Config',
      'HttpMethod',
      'createClient',
      'external',
    ]);
    expect(exports.find((e) => e.name === 'createClient')?.isTypeOnly).toBe(
      false
    );
    expect(exports.find((e) => e.name === 'HttpMethod')?.isTypeOnly).toBe(true);
    // unresolved external re-export: treated as value
    expect(exports.find((e) => e.name === 'external')?.isTypeOnly).toBe(false);
  });

  it('gives the same key to the same binding and different keys otherwise', () => {
    const keyOf = (path: string, name: string) =>
      exportsOf(path).find((e) => e.name === name)?.key;

    expect(keyOf('client/index.ts', 'Config')).toBe(
      keyOf('client/types.gen.ts', 'Config')
    );
    expect(keyOf('client/index.ts', 'Config')).not.toBe(
      keyOf('core/types.gen.ts', 'Config')
    );
    expect(keyOf('client/index.ts', 'HttpMethod')).toBe(
      keyOf('core/types.gen.ts', 'HttpMethod')
    );
  });

  it('returns no exports for scripts and unknown files', () => {
    expect(exportsOf('script.ts')).toEqual([]);
    expect(exportsOf('missing.ts')).toEqual([]);
  });
});
