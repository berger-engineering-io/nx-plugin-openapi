import { HasherContext, Task, workspaceRoot } from '@nx/devkit';
import { resolve } from 'path';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

import { existsSync, readFileSync } from 'fs';
import hasher from './hasher';

const TASK_HASH = 'task-hash';

function createTask(overrides: Record<string, unknown> = {}): Task {
  return {
    id: 'demo:generate-api',
    target: { project: 'demo', target: 'generate-api' },
    overrides,
    outputs: [],
    projectRoot: 'apps/demo',
    parallelism: true,
  } as unknown as Task;
}

function createContext(options: Record<string, unknown>): HasherContext {
  return {
    hasher: {
      hashTask: jest.fn(async () => ({
        value: TASK_HASH,
        details: { command: 'cmd', nodes: {} },
      })),
    },
    taskGraph: { roots: [], tasks: {}, dependencies: {} },
    projectsConfigurations: {
      version: 2,
      projects: {
        demo: { root: 'apps/demo', targets: { 'generate-api': { options } } },
      },
    },
  } as unknown as HasherContext;
}

function mockLocalFiles(files: Record<string, string>) {
  (existsSync as jest.Mock).mockImplementation((path: string) => path in files);
  (readFileSync as jest.Mock).mockImplementation(
    (path: string) => files[path]
  );
}

function mockFetch(responses: Record<string, string | number>) {
  global.fetch = jest.fn(async (url: string) => {
    const response = responses[url];
    return typeof response === 'number'
      ? { ok: false, status: response, statusText: 'Error' }
      : { ok: true, status: 200, text: async () => response };
  }) as unknown as typeof fetch;
}

describe('generate-api hasher', () => {
  const originalFetch = global.fetch;

  beforeEach(() => jest.clearAllMocks());
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('includes local spec content relative to workspace root', async () => {
    const specPath = resolve(workspaceRoot, 'specs/api.json');
    mockLocalFiles({ [specPath]: 'v1' });
    const context = createContext({ inputSpec: 'specs/api.json' });

    const first = await hasher(createTask(), context);
    mockLocalFiles({ [specPath]: 'v2' });
    const second = await hasher(createTask(), context);

    expect(readFileSync).toHaveBeenCalledWith(specPath, 'utf8');
    expect(first.value).not.toEqual(second.value);
    expect(first.value).not.toEqual(TASK_HASH);
    expect(first.details).toEqual({ command: 'cmd', nodes: {} });
  });

  it('supports absolute local spec paths', async () => {
    const specPath = resolve('/abs/api.yaml');
    mockLocalFiles({ [specPath]: 'abs' });

    await hasher(createTask(), createContext({ inputSpec: specPath }));

    expect(readFileSync).toHaveBeenCalledWith(specPath, 'utf8');
  });

  it('includes remote spec content', async () => {
    const url = 'https://example.com/openapi.json';
    const context = createContext({ inputSpec: url });

    mockFetch({ [url]: 'remote-v1' });
    const first = await hasher(createTask(), context);
    mockFetch({ [url]: 'remote-v2' });
    const second = await hasher(createTask(), context);
    mockFetch({ [url]: 'remote-v1' });
    const third = await hasher(createTask(), context);

    expect(global.fetch).toHaveBeenCalledWith(url);
    expect(first.value).not.toEqual(second.value);
    expect(first.value).toEqual(third.value);
  });

  it('hashes every spec of a record inputSpec', async () => {
    const url = 'https://example.com/pets.json';
    const localPath = resolve(workspaceRoot, 'specs/users.json');
    mockLocalFiles({ [localPath]: 'users' });
    mockFetch({ [url]: 'pets' });
    const context = createContext({
      inputSpec: { users: 'specs/users.json', pets: url },
    });

    const first = await hasher(createTask(), context);
    mockFetch({ [url]: 'pets-changed' });
    const second = await hasher(createTask(), context);

    expect(readFileSync).toHaveBeenCalledWith(localPath, 'utf8');
    expect(global.fetch).toHaveBeenCalledWith(url);
    expect(first.value).not.toEqual(second.value);
  });

  it('applies inputSpec from task overrides', async () => {
    const specPath = resolve(workspaceRoot, 'override.json');
    mockLocalFiles({ [specPath]: 'override' });

    await hasher(
      createTask({ inputSpec: 'override.json' }),
      createContext({ inputSpec: 'default.json' })
    );

    expect(readFileSync).toHaveBeenCalledWith(specPath, 'utf8');
  });

  it('fails clearly when remote spec cannot be fetched', async () => {
    const url = 'https://example.com/missing.json';
    mockFetch({ [url]: 404 });

    await expect(
      hasher(createTask(), createContext({ inputSpec: url }))
    ).rejects.toThrow(`Failed to fetch remote OpenAPI spec '${url}'`);
  });

  it('does not throw for missing local file', async () => {
    mockLocalFiles({});

    const result = await hasher(
      createTask(),
      createContext({ inputSpec: 'missing.json' })
    );

    expect(readFileSync).not.toHaveBeenCalled();
    expect(result.value).not.toEqual(TASK_HASH);
  });

  it('throws for invalid inputSpec', async () => {
    await expect(
      hasher(createTask(), createContext({ inputSpec: '' }))
    ).rejects.toThrow(`Invalid or missing 'inputSpec'`);
  });
});
