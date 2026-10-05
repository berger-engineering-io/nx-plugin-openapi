import {
  readJson,
  readNxJson,
  Tree,
  updateJson,
  updateNxJson,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addClientGenerator } from './generator';
import { AddClientGeneratorSchema } from './schema';

function mockFetch(body: string): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => body,
  });
  // jest's node environment may not expose fetch, so assign directly
  global.fetch = fetchMock;
  return fetchMock;
}

describe('add-client generator', () => {
  const originalFetch = global.fetch;
  let tree: Tree;
  const definitionPath = 'libs/shared/petstore/openapi-client.json';
  const baseOptions: AddClientGeneratorSchema = {
    name: 'petstore',
    directory: 'libs/shared/petstore',
    spec: 'specs/petstore.json',
    skipFormat: true,
  };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    updateJson(tree, 'package.json', (json) => ({
      ...json,
      name: '@acme/source',
    }));
    tree.write('specs/petstore.json', '{"openapi":"3.0.0"}');
    tree.write('.gitignore', 'node_modules\n');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('writes a split client definition for a local spec', async () => {
    await addClientGenerator(tree, { ...baseOptions, scope: 'shared' });

    expect(readJson(tree, definitionPath)).toEqual({
      $schema:
        '../../../node_modules/@nx-plugin-openapi/core/src/plugin/openapi-client.schema.json',
      name: 'petstore',
      spec: '../../../specs/petstore.json',
      generator: 'openapi-tools',
      split: {
        aliases: {
          types: '@acme/petstore-types',
          api: '@acme/petstore-api',
          core: '@acme/petstore-core',
        },
      },
      tags: ['scope:shared'],
    });
  });

  it('does not write project.json files', async () => {
    await addClientGenerator(tree, baseOptions);

    expect(
      tree
        .listChanges()
        .map((change) => change.path)
        .filter((path) => path.endsWith('project.json'))
    ).toEqual([]);
  });

  it('registers the plugin once', async () => {
    await addClientGenerator(tree, baseOptions);
    await addClientGenerator(tree, {
      ...baseOptions,
      name: 'store',
      directory: 'libs/store',
      importPrefix: '@store',
    });

    const plugins = readNxJson(tree)?.plugins ?? [];
    expect(
      plugins.filter((plugin) => plugin === '@nx-plugin-openapi/core/plugin')
    ).toHaveLength(1);
  });

  it('keeps an existing plugin registration with options', async () => {
    const nxJson = readNxJson(tree) ?? {};
    nxJson.plugins = [
      {
        plugin: '@nx-plugin-openapi/core/plugin',
        options: { generateTargetName: 'codegen' },
      },
    ];
    updateNxJson(tree, nxJson);

    await addClientGenerator(tree, baseOptions);

    expect(readNxJson(tree)?.plugins).toEqual(nxJson.plugins);
  });

  it('adds tsconfig paths for the split libs', async () => {
    await addClientGenerator(tree, baseOptions);

    expect(
      readJson(tree, 'tsconfig.base.json').compilerOptions.paths
    ).toMatchObject({
      '@acme/petstore-types': ['libs/shared/petstore/types/src/index.ts'],
      '@acme/petstore-api': ['libs/shared/petstore/api/src/index.ts'],
      '@acme/petstore-core': ['libs/shared/petstore/core/src/index.ts'],
    });
  });

  it('uses a custom import prefix', async () => {
    await addClientGenerator(tree, { ...baseOptions, importPrefix: '@pets' });

    expect(readJson(tree, definitionPath).split.aliases.api).toBe(
      '@pets/petstore-api'
    );
  });

  it('fails on an alias that points elsewhere', async () => {
    updateJson(tree, 'tsconfig.base.json', (json) => {
      json.compilerOptions.paths = { '@acme/petstore-api': ['libs/other.ts'] };
      return json;
    });

    await expect(addClientGenerator(tree, baseOptions)).rejects.toThrow(
      `Path alias '@acme/petstore-api' already exists`
    );
  });

  it('writes an unsplit definition without aliases', async () => {
    await addClientGenerator(tree, {
      ...baseOptions,
      split: false,
      adapter: 'hey-api',
      generatorOptions: { client: 'fetch' },
    });

    const definition = readJson(tree, definitionPath);
    expect(definition.split).toBeUndefined();
    expect(definition.generator).toBe('hey-api');
    expect(definition.generatorOptions).toEqual({ client: 'fetch' });
    expect(
      readJson(tree, 'tsconfig.base.json').compilerOptions.paths ?? {}
    ).toEqual({});
    expect(tree.read('.gitignore', 'utf-8')).toContain(
      'libs/shared/petstore/src'
    );
  });

  it('gitignores the generated directories', async () => {
    await addClientGenerator(tree, baseOptions);

    const gitignore = tree.read('.gitignore', 'utf-8');
    for (const dir of ['generated', 'types/src', 'api/src', 'core/src']) {
      expect(gitignore).toContain(`libs/shared/petstore/${dir}`);
    }
  });

  it('downloads a remote spec once and stores the url', async () => {
    const fetchSpy = mockFetch('openapi: 3.0.0\n');

    await addClientGenerator(tree, {
      ...baseOptions,
      spec: 'https://example.com/petstore.yaml',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(
      tree.read('libs/shared/petstore/petstore.openapi.yaml', 'utf-8')
    ).toBe('openapi: 3.0.0\n');
    expect(readJson(tree, definitionPath)).toMatchObject({
      spec: 'petstore.openapi.yaml',
      url: 'https://example.com/petstore.yaml',
    });
  });

  it('stores a downloaded JSON spec verbatim, excluded from prettier', async () => {
    mockFetch('{"openapi":"3.0.0"}');
    tree.write('.prettierignore', '/dist');

    await addClientGenerator(tree, {
      ...baseOptions,
      spec: 'https://example.com/openapi',
      skipFormat: false,
    });

    expect(
      tree.read('libs/shared/petstore/petstore.openapi.json', 'utf-8')
    ).toBe('{"openapi":"3.0.0"}');
    expect(tree.read('.prettierignore', 'utf-8')).toContain(
      'libs/shared/petstore/petstore.openapi.json'
    );
  });

  it('writes a README per split lib so each lib has a tracked file', async () => {
    await addClientGenerator(tree, baseOptions);

    for (const group of ['types', 'api', 'core']) {
      expect(tree.exists(`libs/shared/petstore/${group}/README.md`)).toBe(true);
    }
  });

  it('fails on a missing local spec', async () => {
    await expect(
      addClientGenerator(tree, { ...baseOptions, spec: 'missing.json' })
    ).rejects.toThrow('Spec file not found: missing.json');
  });

  it('fails if the client already exists', async () => {
    await addClientGenerator(tree, baseOptions);

    await expect(addClientGenerator(tree, baseOptions)).rejects.toThrow(
      'already exists'
    );
  });
});
