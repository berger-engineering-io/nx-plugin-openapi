import { HeyApiGenerator } from './hey-api-generator';
import { GeneratorContext } from '@nx-plugin-openapi/core';

// Native import() is unavailable in jest's vm; route it through jest's require.
jest.mock('./utils/dynamic-import', () => ({
  dynamicImport: (specifier: string) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Promise.resolve().then(() => require(specifier)),
}));

jest.mock(
  '@hey-api/openapi-ts',
  () => ({
    generate: jest.fn(async () => undefined),
  }),
  { virtual: true }
);

type GenerateOptions = Parameters<HeyApiGenerator['generate']>[0];

describe('HeyApiGenerator path resolution', () => {
  let generator: HeyApiGenerator;
  let openApiTsGenerate: jest.Mock;
  const ctx: GeneratorContext = { root: '/workspace', workspaceName: 'test' };

  const runGenerate = (inputSpec: unknown, outputPath: string) =>
    generator.generate({ inputSpec, outputPath } as GenerateOptions, ctx);

  beforeEach(async () => {
    jest.clearAllMocks();
    generator = new HeyApiGenerator();
    jest
      .spyOn(
        generator as unknown as { cleanOutput: (...a: unknown[]) => void },
        'cleanOutput'
      )
      .mockImplementation(() => undefined);
    openApiTsGenerate = (
      (await import('@hey-api/openapi-ts')) as unknown as {
        generate: jest.Mock;
      }
    ).generate;
  });

  it('resolves relative inputSpec against workspace root', async () => {
    await runGenerate('specs/petstore.json', 'libs/api/src');

    expect(openApiTsGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: '/workspace/specs/petstore.json',
        output: '/workspace/libs/api/src',
      })
    );
  });

  it('keeps absolute inputSpec untouched', async () => {
    await runGenerate('/abs/specs/petstore.json', 'libs/api/src');

    expect(openApiTsGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ input: '/abs/specs/petstore.json' })
    );
  });

  it('keeps URL inputSpec untouched', async () => {
    const url = 'https://petstore3.swagger.io/api/v3/openapi.json';

    await runGenerate(url, 'libs/api/src');

    expect(openApiTsGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ input: url })
    );
  });

  it('keeps absolute outputPath untouched', async () => {
    await runGenerate('specs/petstore.json', '/abs/out');

    expect(openApiTsGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ output: '/abs/out' })
    );
  });

  it('resolves each record inputSpec entry', async () => {
    const url = 'https://example.com/products.yaml';

    await runGenerate(
      { users: 'specs/users.yaml', products: url },
      '/abs/out'
    );

    expect(openApiTsGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: '/workspace/specs/users.yaml',
        output: '/abs/out/users',
      })
    );
    expect(openApiTsGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ input: url, output: '/abs/out/products' })
    );
  });
});
