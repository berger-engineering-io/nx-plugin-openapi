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
  GeneratedFileKind,
  GeneratorPlugin,
  InputSpec,
} from '../../interfaces';
import { createPostProcessContext, runPostProcessors } from '../run';
import { SplitImportError } from './errors';
import { splitPostProcessor } from './split-post-processor';
import { listGeneratedFiles } from './list-files';

jest.mock('@nx/devkit', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const aliases = { types: '@acme/types', api: '@acme/api', core: '@acme/core' };

const FIXTURE: Record<string, string> = {
  'model/pet.ts': `import { Tag } from './tag';\nexport interface Pet { tag?: Tag }\n`,
  'model/tag.ts': `export interface Tag { name: string }\n`,
  'model/models.ts': `export * from './pet';\nexport * from './tag';\n`,
  'api/pet.service.ts': `import { Pet } from '../model/pet';\nimport { Configuration } from '../configuration';\nexport class PetService { pet?: Pet; config?: Configuration }\n`,
  'api/api.ts': `export * from './pet.service';\n`,
  'configuration.ts': `export class Configuration {}\n`,
  'index.ts': `export * from './api/api';\nexport * from './model/models';\n`,
  'README.md': '# generated\n',
};

/** Fake plugin classifier: by top-level dir. */
function classifyByDir(files: string[]): Record<string, GeneratedFileKind> {
  return Object.fromEntries(
    files.map((path) => {
      if (path.startsWith('model/')) return [path, 'model'];
      if (path.startsWith('api/')) return [path, 'api'];
      if (path.endsWith('.ts') && path !== 'index.ts') return [path, 'core'];
      return [path, 'other'];
    })
  );
}

function writeTree(dir: string, files: Record<string, string>): void {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
}

const generator: GeneratorPlugin = {
  name: 'fake',
  generate: jest.fn(),
  classify: (outDir) => ({ files: classifyByDir(listGeneratedFiles(outDir)) }),
};

describe('split post-processor', () => {
  let root: string;
  const read = (path: string) => readFileSync(join(root, path), 'utf8');

  function context(inputSpec: InputSpec = 'spec.json') {
    return createPostProcessContext({
      root,
      outputPath: 'libs/petstore/generated',
      inputSpec,
      generatorName: 'fake',
      generator,
    });
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'split-'));
    writeTree(join(root, 'libs/petstore/generated'), FIXTURE);
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('is registered as built-in and splits into types/api/core libs', async () => {
    await runPostProcessors(
      [{ name: 'split', options: { aliases } }],
      context()
    );

    expect(listGeneratedFiles(join(root, 'libs/petstore/generated'))).toEqual([
      'README.md',
      'api/src/api/api.ts',
      'api/src/api/pet.service.ts',
      'api/src/index.ts',
      'core/src/configuration.ts',
      'core/src/index.ts',
      'types/src/index.ts',
      'types/src/model/models.ts',
      'types/src/model/pet.ts',
      'types/src/model/tag.ts',
    ]);
    expect(read('libs/petstore/generated/api/src/api/pet.service.ts')).toBe(
      `import { Pet } from '@acme/types';\nimport { Configuration } from '@acme/core';\nexport class PetService { pet?: Pet; config?: Configuration }\n`
    );
    expect(read('libs/petstore/generated/types/src/model/pet.ts')).toBe(
      FIXTURE['model/pet.ts']
    );
    expect(read('libs/petstore/generated/types/src/index.ts')).toContain(
      `export * from './model/models';`
    );
    expect(read('libs/petstore/generated/types/src/index.ts')).not.toContain(
      `'./model/pet'`
    );
    expect(read('libs/petstore/generated/api/src/index.ts')).toContain(
      `export * from './api/api';`
    );
    expect(read('libs/petstore/generated/core/src/index.ts')).toContain(
      `export * from './configuration';`
    );
  });

  it('writes to a custom targetRoot and replaces stale lib sources', async () => {
    writeTree(join(root, 'libs/petstore/types'), {
      'src/stale.ts': '',
      'project.json': '{}',
    });

    await splitPostProcessor.run(context(), {
      aliases,
      targetRoot: 'libs/petstore',
    });

    expect(existsSync(join(root, 'libs/petstore/types/src/stale.ts'))).toBe(
      false
    );
    expect(existsSync(join(root, 'libs/petstore/types/project.json'))).toBe(
      true
    );
    expect(existsSync(join(root, 'libs/petstore/api/src/api/api.ts'))).toBe(
      true
    );
    expect(listGeneratedFiles(join(root, 'libs/petstore/generated'))).toEqual([
      'README.md',
    ]);
  });

  it('fails on forbidden edges without touching the output', async () => {
    writeTree(join(root, 'libs/petstore/generated'), {
      'model/bad.ts': `import { Configuration } from '../configuration';\nexport type Bad = Configuration;\n`,
    });

    const run = splitPostProcessor.run(context(), { aliases });

    await expect(run).rejects.toThrow(SplitImportError);
    await expect(run).rejects.toThrow(
      /model\/bad\.ts: '\.\.\/configuration' \(types -> core is not allowed/
    );
    expect(existsSync(join(root, 'libs/petstore/generated/model/pet.ts'))).toBe(
      true
    );
  });

  it('splits each service of a multi-spec setup', async () => {
    rmSync(join(root, 'libs/petstore/generated'), { recursive: true });
    writeTree(join(root, 'libs/petstore/generated/pets'), FIXTURE);
    writeTree(join(root, 'libs/petstore/generated/users'), FIXTURE);

    await splitPostProcessor.run(context({ pets: 'p.json', users: 'u.json' }), {
      aliases: {
        types: '@acme/{service}-types',
        api: '@acme/{service}-api',
        core: '@acme/{service}-core',
      },
    });

    expect(
      read('libs/petstore/generated/users/api/src/api/pet.service.ts')
    ).toContain(`from '@acme/users-types'`);
    expect(
      existsSync(join(root, 'libs/petstore/generated/pets/types/src/index.ts'))
    ).toBe(true);
  });
});
