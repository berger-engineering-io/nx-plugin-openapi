import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveOpenApiGeneratorCli } from './resolve-cli';

describe('resolveOpenApiGeneratorCli', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = realpathSync(mkdtempSync(join(tmpdir(), 'resolve-cli-')));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('should resolve main.js from the workspace node_modules', () => {
    const cliDir = join(
      workspaceRoot,
      'node_modules',
      '@openapitools',
      'openapi-generator-cli'
    );
    mkdirSync(cliDir, { recursive: true });
    writeFileSync(
      join(cliDir, 'package.json'),
      JSON.stringify({ name: '@openapitools/openapi-generator-cli' })
    );
    writeFileSync(join(cliDir, 'main.js'), '');

    expect(resolveOpenApiGeneratorCli(workspaceRoot)).toBe(
      join(cliDir, 'main.js')
    );
  });

  it('should throw a descriptive error when the CLI is not installed', () => {
    expect(() => resolveOpenApiGeneratorCli(workspaceRoot)).toThrow(
      /Could not resolve "@openapitools\/openapi-generator-cli\/main\.js".*npm install -D @openapitools\/openapi-generator-cli/
    );
  });
});
