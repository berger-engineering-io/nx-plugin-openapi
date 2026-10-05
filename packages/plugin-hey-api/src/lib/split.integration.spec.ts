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
import { HeyApiGenerator } from './hey-api-generator';

jest.mock('@nx/devkit', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

/** Trimmed-down @hey-api/openapi-ts output (fetch client), same import graph as the real one. */
const HEY_API_FIXTURE: Record<string, string> = {
  'index.ts': `export * from './types.gen';\nexport * from './sdk.gen';\n`,
  'types.gen.ts': `export type Pet = { id?: number; name: string };\nexport type GetPetData = { path: { petId: number } };\nexport type ClientOptions = { baseUrl: string };\n`,
  'core/types.gen.ts': `export type HttpMethod = 'get' | 'post';\nexport interface Config { method?: HttpMethod }\n`,
  'core/utils.gen.ts': `import type { Config } from './types.gen';\nexport const getUrl = (config: Config): string => String(config.method);\n`,
  'client/types.gen.ts': `import type { Config as CoreConfig } from '../core/types.gen';\nexport interface Config extends CoreConfig { baseUrl?: string }\nexport interface Client { get<T>(url: string): Promise<T> }\nexport type Options<T = unknown> = { path?: T };\nexport type CreateClientConfig = (override?: Config) => Config;\n`,
  'client/client.gen.ts': `import { getUrl } from '../core/utils.gen';\nimport type { Client, Config } from './types.gen';\nexport const createClient = (config: Config = {}): Client => ({ get: async <T>(url: string) => ({ url: url + getUrl(config) }) as T });\n`,
  'client/index.ts': `export { createClient } from './client.gen';\nexport type { Client, Config, CreateClientConfig, Options } from './types.gen';\nexport const createConfig = <T>(config: T): T => config;\n`,
  'client.gen.ts': `import type { ClientOptions } from './types.gen';\nimport { type Config, createClient, createConfig } from './client';\nexport type CreateClientConfig = (override?: Config) => Config & ClientOptions;\nexport const client = createClient(createConfig<Config & Partial<ClientOptions>>({ baseUrl: '/api' }));\n`,
  'sdk.gen.ts': `import type { Options } from './client';\nimport type { GetPetData, Pet } from './types.gen';\nimport { client } from './client.gen';\nexport const getPet = (options: Options<GetPetData['path']>) => client.get<Pet>('/pet/' + String(options.path?.petId));\n`,
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
    isolatedModules: true,
    target: ts.ScriptTarget.ES2020,
    lib: ['lib.es2020.d.ts'],
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

describe('split post-processor with hey-api', () => {
  let root: string;
  const outDir = () => join(root, 'libs/petstore/generated');
  const read = (path: string) => readFileSync(join(outDir(), path), 'utf8');

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'split-hey-api-'));
    writeTree(outDir(), HEY_API_FIXTURE);
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('splits into types/api/core libs that typecheck with aliases', async () => {
    await splitPostProcessor.run(
      createPostProcessContext({
        root,
        outputPath: 'libs/petstore/generated',
        inputSpec: 'petstore.json',
        generatorName: 'hey-api',
        generator: new HeyApiGenerator() as unknown as GeneratorPlugin,
      }),
      { aliases }
    );

    expect(listGeneratedFiles(outDir())).toEqual([
      'api/src/index.ts',
      'api/src/sdk.gen.ts',
      'core/src/client.gen.ts',
      'core/src/client/client.gen.ts',
      'core/src/client/index.ts',
      'core/src/client/types.gen.ts',
      'core/src/core/types.gen.ts',
      'core/src/core/utils.gen.ts',
      'core/src/index.ts',
      'types/src/index.ts',
      'types/src/types.gen.ts',
    ]);
    expect(read('api/src/sdk.gen.ts')).toContain(
      `import type { Options } from '@acme/petstore-core';\nimport type { GetPetData, Pet } from '@acme/petstore-types';\nimport { client } from '@acme/petstore-core';`
    );
    expect(read('core/src/client.gen.ts')).toContain(
      `import type { ClientOptions } from '@acme/petstore-types';\nimport { type Config, createClient, createConfig } from './client';`
    );
    // entry modules only (core `Config` stays private); clashing `CreateClientConfig` of client/index is omitted
    expect(read('core/src/index.ts')).toContain(
      `export * from './client.gen';\nexport { createClient, createConfig } from './client/index';\nexport type { Client, Config, Options } from './client/index';\n`
    );
    expect(existsSync(join(outDir(), 'index.ts'))).toBe(false);
    expect(typecheckLibs(outDir())).toEqual([]);
  });
});
