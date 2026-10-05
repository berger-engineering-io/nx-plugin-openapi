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
import * as ts from 'typescript';
import {
  createPostProcessContext,
  GeneratorPlugin,
  listGeneratedFiles,
  splitPostProcessor,
} from '@nx-plugin-openapi/core';
import { OpenApiToolsGenerator } from './openapi-tools-generator';

jest.mock('@nx/devkit', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

/** Trimmed-down typescript-angular output (no external imports, so it typechecks standalone). */
const TYPESCRIPT_ANGULAR_FIXTURE: Record<string, string> = {
  '.openapi-generator/FILES': 'model/pet.ts\n',
  'README.md': '# petstore\n',
  'index.ts': `export * from './api/api';\nexport * from './model/models';\nexport * from './variables';\nexport * from './configuration';\nexport * from './param';\n`,
  'param.ts': `export interface Param { name: string }\n`,
  'configuration.ts': `import { Param } from './param';\nexport class Configuration { encodeParam?: (param: Param) => string; basePath?: string }\n`,
  'variables.ts': `export const BASE_PATH = 'basePath';\n`,
  'encoder.ts': `export class CustomHttpParameterCodec { encodeKey(k: string): string { return encodeURIComponent(k); } }\n`,
  'api.base.service.ts': `import { CustomHttpParameterCodec } from './encoder';\nimport { Configuration } from './configuration';\nexport class BaseService { configuration = new Configuration(); encoder = new CustomHttpParameterCodec(); }\n`,
  'model/category.ts': `export interface Category { id?: number; name?: string }\n`,
  'model/pet.ts': `import { Category } from './category';\nexport interface Pet { id?: number; name: string; category?: Category }\n`,
  'model/models.ts': `export * from './category';\nexport * from './pet';\n`,
  'api/pet.service.ts': `import { Pet } from '../model/pet';\nimport { BASE_PATH } from '../variables';\nimport { BaseService } from '../api.base.service';\nexport class PetService extends BaseService { basePath = BASE_PATH; getPet(): Pet { return { name: 'rex' }; } }\n`,
  'api/api.ts': `export * from './pet.service';\nimport { PetService } from './pet.service';\nexport const APIS = [PetService];\n`,
};

const aliases = {
  types: '@acme/petstore-types',
  api: '@acme/petstore-api',
  core: '@acme/petstore-core',
};

function writeTree(dir: string, files: Record<string, string>): void {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
}

/** Typechecks the split libs with path aliases like a workspace tsconfig would. */
function typecheckLibs(targetDir: string): string[] {
  const libFiles = ['types', 'api', 'core'].flatMap((lib) =>
    listGeneratedFiles(join(targetDir, lib, 'src')).map((path) =>
      join(targetDir, lib, 'src', path)
    )
  );
  const program = ts.createProgram(libFiles, {
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2020,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    baseUrl: targetDir,
    paths: {
      [aliases.types]: ['types/src/index.ts'],
      [aliases.api]: ['api/src/index.ts'],
      [aliases.core]: ['core/src/index.ts'],
    },
    types: [],
  });
  return ts
    .getPreEmitDiagnostics(program)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

describe('split post-processor with openapi-tools (typescript-angular)', () => {
  let root: string;
  const outDir = () => join(root, 'libs/petstore/generated');
  const read = (path: string) => readFileSync(join(outDir(), path), 'utf8');

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'split-openapi-'));
    writeTree(outDir(), TYPESCRIPT_ANGULAR_FIXTURE);
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('splits into types/api/core libs that typecheck with aliases', async () => {
    await splitPostProcessor.run(
      createPostProcessContext({
        root,
        outputPath: 'libs/petstore/generated',
        inputSpec: 'petstore.json',
        generatorName: 'openapi-tools',
        generator: new OpenApiToolsGenerator() as unknown as GeneratorPlugin,
      }),
      { aliases }
    );

    expect(listGeneratedFiles(outDir())).toEqual([
      '.openapi-generator/FILES',
      'README.md',
      'api/src/api/api.ts',
      'api/src/api/pet.service.ts',
      'api/src/index.ts',
      'core/src/api.base.service.ts',
      'core/src/configuration.ts',
      'core/src/encoder.ts',
      'core/src/index.ts',
      'core/src/param.ts',
      'core/src/variables.ts',
      'types/src/index.ts',
      'types/src/model/category.ts',
      'types/src/model/models.ts',
      'types/src/model/pet.ts',
    ]);
    expect(read('api/src/api/pet.service.ts')).toContain(
      `import { Pet } from '@acme/petstore-types';\nimport { BASE_PATH } from '@acme/petstore-core';\nimport { BaseService } from '@acme/petstore-core';`
    );
    // models re-exported by `model/models.ts` are not repeated
    expect(read('types/src/index.ts')).toMatch(
      /\nexport \* from '\.\/model\/models';\n$/
    );
    expect(read('api/src/index.ts')).toContain(`export * from './api/api';`);
    expect(existsSync(join(outDir(), 'index.ts'))).toBe(false);
    expect(typecheckLibs(outDir())).toEqual([]);
  });
});
