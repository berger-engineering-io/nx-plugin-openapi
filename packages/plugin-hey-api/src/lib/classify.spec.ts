import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { logger } from '@nx/devkit';
import { classifyHeyApiOutput } from './classify';

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
});
