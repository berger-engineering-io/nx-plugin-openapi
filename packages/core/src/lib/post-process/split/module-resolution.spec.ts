import {
  isCodeFile,
  isRelativeSpecifier,
  isRootBarrel,
  resolveRelativeModule,
  toModuleSpecifierPath,
} from './module-resolution';

describe('module-resolution', () => {
  const knownFiles = new Set([
    'configuration.ts',
    'model/pet.ts',
    'model/models.ts',
    'client/index.ts',
    'client.gen.ts',
    'types.d.ts',
    'esm/util.mts',
    'index.ts',
  ]);

  it.each([
    ['api/pet.service.ts', '../model/pet', 'model/pet.ts'],
    ['api/pet.service.ts', '../configuration', 'configuration.ts'],
    ['api/pet.service.ts', '../model/pet.js', 'model/pet.ts'],
    ['api/pet.service.ts', '../model/pet.ts', 'model/pet.ts'],
    ['sdk.gen.ts', './client', 'client/index.ts'],
    ['sdk.gen.ts', './client/', 'client/index.ts'],
    ['sdk.gen.ts', './client.gen', 'client.gen.ts'],
    ['sdk.gen.ts', './types', 'types.d.ts'],
    ['sdk.gen.ts', './esm/util.mjs', 'esm/util.mts'],
    ['client/index.ts', '..', 'index.ts'],
    ['sdk.gen.ts', '.', 'index.ts'],
  ])('resolves %s -> %s', (importer, specifier, expected) => {
    expect(resolveRelativeModule(importer, specifier, knownFiles)).toBe(
      expected
    );
  });

  it('returns undefined for missing or escaping modules', () => {
    expect(
      resolveRelativeModule('a.ts', './missing', knownFiles)
    ).toBeUndefined();
    expect(
      resolveRelativeModule('a.ts', '../outside/model/pet', knownFiles)
    ).toBeUndefined();
  });

  it.each([
    ['model/pet.ts', 'model/pet'],
    ['types.d.ts', 'types'],
    ['client/index.tsx', 'client/index'],
    ['esm/util.mts', 'esm/util.mjs'],
    ['legacy.js', 'legacy'],
  ])('converts %s to specifier path %s', (path, expected) => {
    expect(toModuleSpecifierPath(path)).toBe(expected);
  });

  it('detects code files, root barrels and relative specifiers', () => {
    expect(isCodeFile('a.ts')).toBe(true);
    expect(isCodeFile('a.d.ts')).toBe(true);
    expect(isCodeFile('README.md')).toBe(false);
    expect(isRootBarrel('index.ts')).toBe(true);
    expect(isRootBarrel('client/index.ts')).toBe(false);
    expect(isRelativeSpecifier('./a')).toBe(true);
    expect(isRelativeSpecifier('..')).toBe(true);
    expect(isRelativeSpecifier('@angular/core')).toBe(false);
    expect(isRelativeSpecifier('.hidden')).toBe(false);
  });
});
