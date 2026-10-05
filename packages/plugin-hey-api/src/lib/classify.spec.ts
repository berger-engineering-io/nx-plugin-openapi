import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { logger } from '@nx/devkit';
import { classifyHeyApiOutput } from './classify';
import { HeyApiGenerator } from './hey-api-generator';

jest.mock('@nx/devkit', () => ({ logger: { warn: jest.fn() } }));

function createTree(paths: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'hey-api-classify-'));
  for (const path of paths) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), '');
  }
  return dir;
}

describe('classifyHeyApiOutput', () => {
  let dir: string;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('classifies the hey-api layout', () => {
    dir = createTree([
      'client.gen.ts',
      'client/client.gen.ts',
      'client/index.ts',
      'core/types.gen.ts',
      'index.ts',
      'schemas.gen.ts',
      'sdk.gen.ts',
      'transformers.gen.ts',
      'types.gen.ts',
      'zod.gen.ts',
      '@tanstack/react-query.gen.ts',
    ]);

    expect(classifyHeyApiOutput(dir).files).toEqual({
      '@tanstack/react-query.gen.ts': 'api',
      'client.gen.ts': 'core',
      'client/client.gen.ts': 'core',
      'client/index.ts': 'core',
      'core/types.gen.ts': 'core',
      'index.ts': 'other',
      'schemas.gen.ts': 'model',
      'sdk.gen.ts': 'api',
      'transformers.gen.ts': 'core',
      'types.gen.ts': 'model',
      'zod.gen.ts': 'model',
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('treats unknown files as other and warns', () => {
    dir = createTree(['mystery.gen.ts', 'nested/thing.ts', 'README.md']);

    expect(classifyHeyApiOutput(dir).files).toEqual({
      'README.md': 'other',
      'mystery.gen.ts': 'other',
      'nested/thing.ts': 'other',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('mystery.gen.ts, nested/thing.ts')
    );
  });

  it('accepts top-level files without the .gen suffix', () => {
    dir = createTree(['types.ts', 'sdk.ts', 'client.ts', 'valibot.ts']);

    expect(classifyHeyApiOutput(dir).files).toEqual({
      'client.ts': 'core',
      'sdk.ts': 'api',
      'types.ts': 'model',
      'valibot.ts': 'model',
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each(['js', 'mjs', 'cjs', 'mts', 'cts', 'tsx', 'jsx'])(
    'recognises .%s output',
    (extension) => {
      dir = createTree([`types.gen.${extension}`, `sdk.gen.${extension}`]);

      expect(classifyHeyApiOutput(dir).files).toEqual({
        [`sdk.gen.${extension}`]: 'api',
        [`types.gen.${extension}`]: 'model',
      });
    }
  );

  it('treats non-code files as other without warning, even in core dirs', () => {
    dir = createTree(['client/README.md', 'core/LICENSE', 'openapi.json']);

    expect(classifyHeyApiOutput(dir).files).toEqual({
      'client/README.md': 'other',
      'core/LICENSE': 'other',
      'openapi.json': 'other',
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('classifies deeply nested core and scoped plugin files', () => {
    dir = createTree([
      'client/utils/serializer.gen.ts',
      '@pinia/colada/queries.gen.ts',
    ]);

    expect(classifyHeyApiOutput(dir).files).toEqual({
      '@pinia/colada/queries.gen.ts': 'api',
      'client/utils/serializer.gen.ts': 'core',
    });
  });

  it('does not match core dirs by prefix only', () => {
    dir = createTree(['clients/index.ts', 'core-extra/utils.ts']);

    expect(classifyHeyApiOutput(dir).files).toEqual({
      'clients/index.ts': 'other',
      'core-extra/utils.ts': 'other',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('2 file(s)')
    );
  });

  it('returns no files for an empty or missing output dir', () => {
    dir = createTree([]);

    expect(classifyHeyApiOutput(dir).files).toEqual({});
    expect(classifyHeyApiOutput(join(dir, 'missing')).files).toEqual({});
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('is exposed as HeyApiGenerator#classify', () => {
    dir = createTree(['types.gen.ts']);

    expect(new HeyApiGenerator().classify(dir)).toEqual({
      files: { 'types.gen.ts': 'model' },
    });
  });
});
