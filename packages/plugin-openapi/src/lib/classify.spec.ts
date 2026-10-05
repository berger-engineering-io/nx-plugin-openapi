import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { logger } from '@nx/devkit';
import { classifyOpenApiToolsOutput } from './classify';

jest.mock('@nx/devkit', () => ({ logger: { warn: jest.fn() } }));

function createTree(paths: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'openapi-classify-'));
  for (const path of paths) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), '');
  }
  return dir;
}

describe('classifyOpenApiToolsOutput', () => {
  let dir: string;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('classifies the typescript-angular layout', () => {
    dir = createTree([
      '.openapi-generator/FILES',
      'README.md',
      'api.base.service.ts',
      'api.module.ts',
      'api/api.ts',
      'api/pet.service.ts',
      'configuration.ts',
      'encoder.ts',
      'index.ts',
      'model/models.ts',
      'model/pet.ts',
      'param.ts',
      'provide-api.ts',
      'variables.ts',
    ]);

    expect(classifyOpenApiToolsOutput(dir).files).toEqual({
      '.openapi-generator/FILES': 'other',
      'README.md': 'other',
      'api.base.service.ts': 'core',
      'api.module.ts': 'core',
      'api/api.ts': 'api',
      'api/pet.service.ts': 'api',
      'configuration.ts': 'core',
      'encoder.ts': 'core',
      'index.ts': 'other',
      'model/models.ts': 'model',
      'model/pet.ts': 'model',
      'param.ts': 'core',
      'provide-api.ts': 'core',
      'variables.ts': 'core',
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('classifies typescript-fetch layout (apis/models/runtime)', () => {
    dir = createTree([
      'apis/PetApi.ts',
      'models/Pet.ts',
      'runtime.ts',
      'index.ts',
    ]);

    expect(
      classifyOpenApiToolsOutput(dir, {
        generatorOptions: { generatorName: 'typescript-fetch' },
      }).files
    ).toEqual({
      'apis/PetApi.ts': 'api',
      'models/Pet.ts': 'model',
      'runtime.ts': 'core',
      'index.ts': 'other',
    });
  });

  it('honors apiPackage/modelPackage', () => {
    dir = createTree(['services/pet.service.ts', 'dto/pet.ts']);

    expect(
      classifyOpenApiToolsOutput(dir, {
        generatorOptions: { apiPackage: 'services', modelPackage: 'dto' },
      }).files
    ).toEqual({ 'services/pet.service.ts': 'api', 'dto/pet.ts': 'model' });
  });

  it('treats a single-file typescript-axios api.ts as other', () => {
    dir = createTree(['api.ts', 'base.ts', 'common.ts', 'configuration.ts']);

    expect(classifyOpenApiToolsOutput(dir).files['api.ts']).toBe('other');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('api.ts'));
  });

  it('warns for unknown dirs and non-typescript generators', () => {
    dir = createTree(['unknown/thing.ts']);

    expect(
      classifyOpenApiToolsOutput(dir, {
        generatorOptions: { generatorName: 'java' },
      }).files
    ).toEqual({ 'unknown/thing.ts': 'other' });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`typescript-* generators only, got 'java'`)
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('unknown/thing.ts')
    );
  });
});
