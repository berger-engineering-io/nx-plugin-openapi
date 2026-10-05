import { ExecutorContext } from '@nx/devkit';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import executor from './executor';

const spec = { openapi: '3.0.0', info: { title: 'Pets', version: '1' } };
const rawSpec = JSON.stringify(spec);

function mockFetch(body: string, init: { status?: number } = {}) {
  const status = init.status ?? 200;
  const fetchMock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Unauthorized',
    text: async () => body,
  });
  // jest's node environment may not expose fetch, so assign directly
  global.fetch = fetchMock;
  return fetchMock;
}

describe('core update-spec executor', () => {
  let root: string;
  let ctx: ExecutorContext;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'update-spec-'));
    ctx = { root, cwd: root, isVerbose: false } as unknown as ExecutorContext;
  });

  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
    delete process.env.SPEC_TOKEN;
  });

  it('creates spec file and parent dirs', async () => {
    mockFetch(rawSpec);
    const res = await executor(
      { url: 'https://x/spec.json', specPath: 'apps/a/openapi.json' },
      ctx
    );
    expect(res.success).toBe(true);
    expect(readFileSync(join(root, 'apps/a/openapi.json'), 'utf-8')).toBe(
      rawSpec
    );
  });

  it('pretty-prints JSON with format json', async () => {
    mockFetch(rawSpec);
    await executor(
      { url: 'https://x/spec', specPath: 'spec.json', format: 'json' },
      ctx
    );
    expect(readFileSync(join(root, 'spec.json'), 'utf-8')).toBe(
      `${JSON.stringify(spec, null, 2)}\n`
    );
  });

  it('does not write when content is unchanged', async () => {
    const specPath = join(root, 'spec.json');
    writeFileSync(specPath, rawSpec);
    const writeSpy = jest.spyOn(jest.requireActual('fs'), 'writeFileSync');
    mockFetch(rawSpec);
    const res = await executor({ url: 'https://x/s', specPath }, ctx);
    expect(res.success).toBe(true);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('check mode fails on drift without writing', async () => {
    writeFileSync(join(root, 'spec.json'), 'old');
    mockFetch(rawSpec);
    const res = await executor(
      { url: 'https://x/s', specPath: 'spec.json', check: true },
      ctx
    );
    expect(res.success).toBe(false);
    expect(readFileSync(join(root, 'spec.json'), 'utf-8')).toBe('old');
  });

  it('check mode passes when in sync', async () => {
    writeFileSync(join(root, 'spec.json'), rawSpec);
    mockFetch(rawSpec);
    const res = await executor(
      { url: 'https://x/s', specPath: 'spec.json', check: true },
      ctx
    );
    expect(res.success).toBe(true);
  });

  it('fails on non-OK HTTP response', async () => {
    mockFetch('nope', { status: 401 });
    const res = await executor(
      { url: 'https://x/s', specPath: 'spec.json' },
      ctx
    );
    expect(res.success).toBe(false);
    expect(existsSync(join(root, 'spec.json'))).toBe(false);
  });

  it('substitutes env vars in headers', async () => {
    process.env.SPEC_TOKEN = 'secret';
    const fetchSpy = mockFetch(rawSpec);
    await executor(
      {
        url: 'https://x/s',
        specPath: 'spec.json',
        headers: { Authorization: 'Bearer ${SPEC_TOKEN}' },
      },
      ctx
    );
    expect(fetchSpy).toHaveBeenCalledWith('https://x/s', {
      headers: { Authorization: 'Bearer secret' },
    });
  });

  it('fails when header env var is missing', async () => {
    const fetchSpy = mockFetch(rawSpec);
    const res = await executor(
      {
        url: 'https://x/s',
        specPath: 'spec.json',
        headers: { Authorization: 'Bearer ${SPEC_TOKEN}' },
      },
      ctx
    );
    expect(res.success).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('writes multiple specs into a directory', async () => {
    mockFetch(rawSpec);
    const res = await executor(
      {
        urls: { users: 'https://x/users.yaml', pets: 'https://x/pets' },
        specPath: 'specs',
      },
      ctx
    );
    expect(res.success).toBe(true);
    expect(existsSync(join(root, 'specs/users.yaml'))).toBe(true);
    expect(existsSync(join(root, 'specs/pets.json'))).toBe(true);
  });

  it('writes multiple specs to explicit specPaths', async () => {
    mockFetch(rawSpec);
    const res = await executor(
      {
        urls: { users: 'https://x/users' },
        specPaths: { users: 'api/users-openapi.json' },
      },
      ctx
    );
    expect(res.success).toBe(true);
    expect(existsSync(join(root, 'api/users-openapi.json'))).toBe(true);
  });

  it('fails on invalid option combinations', async () => {
    mockFetch(rawSpec);
    expect((await executor({ url: 'https://x/s' }, ctx)).success).toBe(false);
    expect((await executor({ specPath: 'a.json' }, ctx)).success).toBe(false);
    expect((await executor({ urls: { a: 'https://x/a' } }, ctx)).success).toBe(
      false
    );
  });
});
