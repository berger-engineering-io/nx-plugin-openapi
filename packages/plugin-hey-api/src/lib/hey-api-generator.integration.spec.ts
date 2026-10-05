import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const WORKSPACE_ROOT = join(__dirname, '../../../..');
const GENERATOR_SOURCE = join(__dirname, 'hey-api-generator.ts');

/** @hey-api/openapi-ts >= 0.9x is ESM-only and requires node >= 22.18. */
function supportsHeyApi(): boolean {
  const [major, minor] = process.versions.node.split('.').map(Number);
  return major > 22 || (major === 22 && minor >= 18);
}

const PETSTORE_SPEC = {
  openapi: '3.0.3',
  info: { title: 'Petstore', version: '1.0.0' },
  paths: {
    '/pets/{petId}': {
      get: {
        operationId: 'getPetById',
        parameters: [
          {
            name: 'petId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': {
            description: 'A pet',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Pet' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } },
      },
    },
  },
};

/**
 * Jest's vm cannot perform a native `import()`, so the generator runs in a
 * child node process (TS source transpiled by @swc-node/register).
 */
const CHILD_SCRIPT = `
const { writeFileSync } = require('node:fs');
const [root, generatorSource] = process.argv.slice(1);
const plugin = require(generatorSource).default;
plugin
  .generate({ inputSpec: 'specs/petstore.json', outputPath: 'libs/petstore' }, { root, workspaceName: 'test' })
  .then(() => writeFileSync(root + '/classification.json', JSON.stringify(plugin.classify(root + '/libs/petstore'))))
  .catch((error) => { console.error(error); process.exit(1); });
`;

function runGenerator(root: string) {
  return spawnSync(
    process.execPath,
    ['-r', '@swc-node/register', '-e', CHILD_SCRIPT, root, GENERATOR_SOURCE],
    {
      cwd: WORKSPACE_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        SWC_NODE_PROJECT: join(WORKSPACE_ROOT, 'tsconfig.base.json'),
      },
      timeout: 20_000,
    }
  );
}

(supportsHeyApi() ? describe : describe.skip)(
  'HeyApiGenerator with real @hey-api/openapi-ts',
  () => {
    let root: string;
    let outputDir: string;

    beforeEach(() => {
      root = mkdtempSync(join(tmpdir(), 'hey-api-real-'));
      outputDir = join(root, 'libs/petstore');
      mkdirSync(join(root, 'specs'));
      writeFileSync(
        join(root, 'specs/petstore.json'),
        JSON.stringify(PETSTORE_SPEC)
      );
    });

    afterEach(() => rmSync(root, { recursive: true, force: true }));

    it('generates and classifies a client from a local spec', () => {
      mkdirSync(outputDir, { recursive: true });
      writeFileSync(join(outputDir, 'stale.gen.ts'), '');

      const result = runGenerator(root);

      if (result.status !== 0)
        throw new Error(result.stderr || result.error?.message);
      expect(existsSync(join(outputDir, 'stale.gen.ts'))).toBe(false);
      expect(readFileSync(join(outputDir, 'sdk.gen.ts'), 'utf8')).toContain(
        'getPetById'
      );
      expect(readFileSync(join(outputDir, 'types.gen.ts'), 'utf8')).toContain(
        'Pet'
      );

      const { files } = JSON.parse(
        readFileSync(join(root, 'classification.json'), 'utf8')
      );
      expect(files).toMatchObject({
        'client.gen.ts': 'core',
        'index.ts': 'other',
        'sdk.gen.ts': 'api',
        'types.gen.ts': 'model',
      });
    }, 30_000);
  }
);
