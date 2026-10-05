import {
  findModuleSpecifiers,
  ImportRewriteContext,
  rewriteImports,
} from './import-rewrite';
import { SplitGroup } from './options';

const groups: Record<string, SplitGroup | undefined> = {
  'model/pet.ts': 'types',
  'model/tag.ts': 'types',
  'api/pet.service.ts': 'api',
  'api/api.ts': 'api',
  'configuration.ts': 'core',
  'client/index.ts': 'core',
  'README.md': undefined,
  'index.ts': undefined,
};

const ctx: ImportRewriteContext = {
  knownFiles: new Set(Object.keys(groups)),
  groupOf: (path) => groups[path],
  aliases: { types: '@acme/types', api: '@acme/api', core: '@acme/core' },
};

describe('findModuleSpecifiers', () => {
  it('finds all import forms and ignores comments and strings', () => {
    const source = [
      `import a from './a';`,
      `import type { B } from "../b.js";`,
      `export * from './c';`,
      `export { d } from './d/index';`,
      `const e = import('./e');`,
      `type F = import('./f').F;`,
      `// import './commented';`,
      `const s = "import './in-string'";`,
    ].join('\n');

    const specifiers = findModuleSpecifiers(source);

    expect(specifiers.map((s) => s.specifier)).toEqual([
      './a',
      '../b.js',
      './c',
      './d/index',
      './e',
      './f',
    ]);
    specifiers.forEach(({ specifier, start, end }) =>
      expect(source.slice(start, end)).toBe(specifier)
    );
    expect(
      specifiers.filter((s) => s.isStarReExport).map((s) => s.specifier)
    ).toEqual(['./c']);
  });
});

describe('rewriteImports', () => {
  it('rewrites cross-group imports to aliases and keeps same-group ones', () => {
    const content = [
      `import { HttpClient } from '@angular/common/http';`,
      `import { Pet } from '../model/pet';`,
      `import type { Tag } from '../model/tag.js';`,
      `import { Configuration } from '../configuration';`,
      `export * from './api';`,
      `const lazy = () => import('../client');`,
    ].join('\n');

    const result = rewriteImports(
      { path: 'api/pet.service.ts', group: 'api', content },
      ctx
    );

    expect(result.violations).toEqual([]);
    expect(result.content).toBe(
      [
        `import { HttpClient } from '@angular/common/http';`,
        `import { Pet } from '@acme/types';`,
        `import type { Tag } from '@acme/types';`,
        `import { Configuration } from '@acme/core';`,
        `export * from './api';`,
        `const lazy = () => import('@acme/core');`,
      ].join('\n')
    );
    expect(result.sameGroupImports).toEqual(['api/api.ts']);
    expect(result.sameGroupStarReExports).toEqual(['api/api.ts']);
    expect(result.crossGroupImports.sort()).toEqual([
      'client/index.ts',
      'configuration.ts',
      'model/pet.ts',
      'model/tag.ts',
    ]);
  });

  it('reports forbidden edges', () => {
    const result = rewriteImports(
      {
        path: 'model/pet.ts',
        group: 'types',
        content: `import { Configuration } from '../configuration';\nimport { PetService } from '../api/pet.service';`,
      },
      ctx
    );

    expect(result.violations).toEqual([
      {
        file: 'model/pet.ts',
        specifier: '../configuration',
        reason: `types -> core is not allowed ('configuration.ts')`,
      },
      {
        file: 'model/pet.ts',
        specifier: '../api/pet.service',
        reason: `types -> api is not allowed ('api/pet.service.ts')`,
      },
    ]);
  });

  it('reports unresolvable imports and imports of unmoved files', () => {
    const result = rewriteImports(
      {
        path: 'configuration.ts',
        group: 'core',
        content: `import './missing';\nimport { x } from './index';`,
      },
      ctx
    );

    expect(result.violations.map((v) => v.specifier)).toEqual([
      './missing',
      './index',
    ]);
    expect(result.violations[0].reason).toMatch(/cannot be resolved/);
    expect(result.violations[1].reason).toMatch(/not moved/);
  });
});
