import {
  AggregateCreateNodesError,
  CreateNodesContextV2,
  ProjectConfiguration,
} from '@nx/devkit';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ClientDefinition } from './client-definition';
import { createNodesV2, OpenApiPluginOptions } from './create-nodes';

describe('createNodesV2', () => {
  const [glob, createNodes] = createNodesV2;
  let workspaceRoot: string;
  let context: CreateNodesContextV2;

  function writeFile(path: string, content: unknown): void {
    const absolutePath = join(workspaceRoot, path);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, JSON.stringify(content));
  }

  function writeClient(path: string, definition: Partial<ClientDefinition>) {
    writeFile(path, definition);
  }

  async function inferProjects(
    files: string[],
    options?: OpenApiPluginOptions
  ): Promise<Record<string, ProjectConfiguration>> {
    const results = await createNodes(files, options, context);
    return Object.assign(
      {},
      ...results.map(([, result]) => result.projects ?? {})
    );
  }

  /** Messages of the per-file errors aggregated by createNodesFromFiles. */
  async function inferErrors(files: string[]): Promise<string[]> {
    try {
      await createNodes(files, undefined, context);
    } catch (error) {
      return (error as AggregateCreateNodesError).errors.map(
        ([, fileError]) => fileError.message
      );
    }
    throw new Error('Expected createNodes to fail');
  }

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'openapi-create-nodes-'));
    context = { nxJsonConfiguration: {}, workspaceRoot };
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('matches openapi-client.json files', () => {
    expect(glob).toBe('**/openapi-client.json');
  });

  it('infers a client project with a cached generate target', async () => {
    writeClient('libs/shared/petstore/openapi-client.json', {
      spec: 'petstore.openapi.json',
      generator: 'hey-api',
      generatorOptions: { client: 'fetch' },
      tags: ['scope:shared'],
    });

    const projects = await inferProjects([
      'libs/shared/petstore/openapi-client.json',
    ]);

    expect(projects).toEqual({
      'libs/shared/petstore': {
        root: 'libs/shared/petstore',
        name: 'petstore',
        projectType: 'library',
        tags: ['scope:shared', 'type:api'],
        targets: {
          generate: {
            executor: '@nx-plugin-openapi/core:generate-api',
            cache: true,
            inputs: [
              '{workspaceRoot}/libs/shared/petstore/openapi-client.json',
              '{workspaceRoot}/libs/shared/petstore/petstore.openapi.json',
            ],
            outputs: ['{workspaceRoot}/libs/shared/petstore/src'],
            options: {
              generator: 'hey-api',
              inputSpec: 'libs/shared/petstore/petstore.openapi.json',
              outputPath: 'libs/shared/petstore/src',
              generatorOptions: { client: 'fetch' },
            },
          },
        },
      },
    });
  });

  it('adds an uncached update-spec target with check mode when a url is set', async () => {
    writeClient('apis/petstore/openapi-client.json', {
      name: 'pets',
      spec: '../specs/petstore.yaml',
      url: 'https://example.com/petstore.yaml',
      headers: { Authorization: 'Bearer ${TOKEN}' },
      format: 'raw',
    });

    const projects = await inferProjects(['apis/petstore/openapi-client.json']);
    const targets = projects['apis/petstore'].targets ?? {};

    expect(targets['update-spec']).toEqual({
      executor: '@nx-plugin-openapi/core:update-spec',
      cache: false,
      options: {
        url: 'https://example.com/petstore.yaml',
        specPath: 'apis/specs/petstore.yaml',
        headers: { Authorization: 'Bearer ${TOKEN}' },
        format: 'raw',
      },
      configurations: { check: { check: true } },
    });
    expect(targets['generate'].dependsOn).toBeUndefined();
    expect(targets['generate'].inputs).toContain(
      '{workspaceRoot}/apis/specs/petstore.yaml'
    );
  });

  it('infers the split libs with tags and generate-first dependencies', async () => {
    writeClient('libs/petstore/openapi-client.json', {
      spec: 'petstore.openapi.json',
      tags: ['scope:petstore'],
      split: {
        aliases: {
          types: '@acme/petstore-types',
          api: '@acme/petstore-api',
          core: '@acme/petstore-core',
        },
      },
    });

    const projects = await inferProjects(
      ['libs/petstore/openapi-client.json'],
      {
        tags: ['openapi'],
      }
    );

    expect(Object.keys(projects).sort()).toEqual([
      'libs/petstore',
      'libs/petstore/api',
      'libs/petstore/core',
      'libs/petstore/types',
    ]);
    expect(projects['libs/petstore'].tags).toEqual([
      'openapi',
      'scope:petstore',
    ]);

    const generate = projects['libs/petstore'].targets?.['generate'];
    expect(generate?.outputs).toEqual([
      '{workspaceRoot}/libs/petstore/generated',
      '{workspaceRoot}/libs/petstore/types/src',
      '{workspaceRoot}/libs/petstore/api/src',
      '{workspaceRoot}/libs/petstore/core/src',
    ]);
    expect(generate?.options.postProcess).toEqual([
      {
        name: 'split',
        options: {
          targetRoot: 'libs/petstore',
          aliases: {
            types: '@acme/petstore-types',
            api: '@acme/petstore-api',
            core: '@acme/petstore-core',
          },
        },
      },
    ]);

    const generateFirst = {
      dependsOn: ['...', { projects: ['petstore'], target: 'generate' }],
    };
    expect(projects['libs/petstore/api']).toEqual({
      root: 'libs/petstore/api',
      name: 'petstore-api',
      projectType: 'library',
      sourceRoot: 'libs/petstore/api/src',
      tags: ['openapi', 'scope:petstore', 'type:api'],
      implicitDependencies: ['petstore'],
      targets: { build: generateFirst, typecheck: generateFirst },
    });
    expect(projects['libs/petstore/types'].tags).toContain('type:types');
    expect(projects['libs/petstore/core'].tags).toContain('type:util');
  });

  it('places split libs below a custom targetRoot', async () => {
    writeClient('openapi/petstore/openapi-client.json', {
      spec: 'petstore.json',
      output: '../../tmp/petstore',
      split: {
        targetRoot: '../../libs/petstore',
        aliases: { types: '@a/t', api: '@a/a', core: '@a/c' },
      },
    });

    const projects = await inferProjects([
      'openapi/petstore/openapi-client.json',
    ]);

    expect(Object.keys(projects).sort()).toEqual([
      'libs/petstore/api',
      'libs/petstore/core',
      'libs/petstore/types',
      'openapi/petstore',
    ]);
    expect(
      projects['openapi/petstore'].targets?.['generate'].options.outputPath
    ).toBe('tmp/petstore');
  });

  it('honors custom target names and dependent targets', async () => {
    writeClient('libs/petstore/openapi-client.json', {
      spec: 'petstore.json',
      url: 'https://example.com/petstore.json',
      split: { aliases: { types: '@a/t', api: '@a/a', core: '@a/c' } },
    });

    const projects = await inferProjects(
      ['libs/petstore/openapi-client.json'],
      {
        generateTargetName: 'codegen',
        updateSpecTargetName: 'pull-spec',
        dependentTargets: ['compile'],
      }
    );

    expect(Object.keys(projects['libs/petstore'].targets ?? {})).toEqual([
      'codegen',
      'pull-spec',
    ]);
    expect(projects['libs/petstore/types'].targets).toEqual({
      compile: {
        dependsOn: ['...', { projects: ['petstore'], target: 'codegen' }],
      },
    });
  });

  it('references the name of an existing project.json', async () => {
    writeClient('libs/petstore/openapi-client.json', {
      spec: 'petstore.json',
      split: { aliases: { types: '@a/t', api: '@a/a', core: '@a/c' } },
    });
    writeFile('libs/petstore/project.json', { name: 'petstore-client' });

    const projects = await inferProjects(['libs/petstore/openapi-client.json']);

    expect(projects['libs/petstore'].name).toBe('petstore-client');
    expect(projects['libs/petstore/api'].implicitDependencies).toEqual([
      'petstore-client',
    ]);
  });

  it.each([
    [{}, `'spec' must be a non-empty string`],
    [{ spec: 'https://example.com/a.json' }, `'spec' must be a local file`],
    [{ spec: 'a.json', output: '.' }, `'output' must be a sub directory`],
    [{ spec: '../../../a.json' }, `'spec' must stay inside the workspace`],
    [
      { spec: 'a.json', split: { aliases: { types: '@a/t', api: '@a/a' } } },
      `'split.aliases.core' must be a non-empty string`,
    ],
  ])('rejects invalid definition %j', async (definition, message) => {
    writeClient('libs/petstore/openapi-client.json', definition as never);

    expect(await inferErrors(['libs/petstore/openapi-client.json'])).toEqual([
      expect.stringContaining(message),
    ]);
  });

  it('requires a name for a definition in the workspace root', async () => {
    writeClient('openapi-client.json', { spec: 'a.json' });

    expect(await inferErrors(['openapi-client.json'])).toEqual([
      `openapi-client.json: 'name' must be a non-empty string`,
    ]);
  });
});
