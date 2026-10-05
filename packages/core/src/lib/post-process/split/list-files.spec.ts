import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listGeneratedFiles } from './list-files';

describe('listGeneratedFiles', () => {
  it('lists files recursively as sorted POSIX paths', () => {
    const dir = mkdtempSync(join(tmpdir(), 'split-list-'));
    mkdirSync(join(dir, 'model/nested'), { recursive: true });
    writeFileSync(join(dir, 'model/nested/a.ts'), '');
    writeFileSync(join(dir, 'b.ts'), '');
    writeFileSync(join(dir, '.gitignore'), '');

    expect(listGeneratedFiles(dir)).toEqual([
      '.gitignore',
      'b.ts',
      'model/nested/a.ts',
    ]);
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns an empty list for missing dirs', () => {
    expect(listGeneratedFiles('/does/not/exist')).toEqual([]);
  });
});
