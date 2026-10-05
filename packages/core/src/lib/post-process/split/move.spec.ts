import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  readGeneratedFile,
  removeGeneratedFiles,
  resetLibSources,
  writeLibFile,
} from './move';

function writeTree(dir: string, files: Record<string, string>): void {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
}

describe('move', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'split-move-'));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('reads generated files and fails for missing ones', () => {
    writeTree(dir, { 'a.ts': 'x' });

    expect(readGeneratedFile(dir, 'a.ts').toString()).toBe('x');
    expect(() => readGeneratedFile(dir, 'missing.ts')).toThrow(
      /does not exist/
    );
  });

  it('removes files and prunes empty dirs', () => {
    writeTree(dir, {
      'model/pet.ts': '',
      'deep/nested/a.ts': '',
      'deep/keep.md': '',
    });

    removeGeneratedFiles(dir, ['model/pet.ts', 'deep/nested/a.ts']);

    expect(existsSync(join(dir, 'model'))).toBe(false);
    expect(existsSync(join(dir, 'deep/nested'))).toBe(false);
    expect(existsSync(join(dir, 'deep/keep.md'))).toBe(true);
    expect(existsSync(dir)).toBe(true);
  });

  it('resets lib sources but keeps other lib files', () => {
    writeTree(dir, {
      'types/src/stale.ts': '',
      'types/project.json': '{}',
    });

    resetLibSources(dir);

    expect(existsSync(join(dir, 'types/src'))).toBe(false);
    expect(existsSync(join(dir, 'types/project.json'))).toBe(true);
  });

  it('writes lib files below <group>/src', () => {
    writeLibFile(dir, 'api', 'api/pet.service.ts', 'content');

    expect(readFileSync(join(dir, 'api/src/api/pet.service.ts'), 'utf8')).toBe(
      'content'
    );
  });
});
