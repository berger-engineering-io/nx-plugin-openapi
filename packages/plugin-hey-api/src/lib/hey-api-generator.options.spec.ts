import { logger } from '@nx/devkit';
import { GeneratorContext } from '@nx-plugin-openapi/core';
import { HeyApiGenerator } from './hey-api-generator';

// Native import() is unavailable in jest's vm; route it through jest's require.
jest.mock('./utils/dynamic-import', () => ({
  dynamicImport: (specifier: string) =>
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

describe('HeyApiGenerator generatorOptions merging', () => {
  let generator: HeyApiGenerator;
  let openApiTsGenerate: jest.Mock;
  let warnSpy: jest.SpyInstance;
  const ctx: GeneratorContext = { root: '/workspace', workspaceName: 'test' };

  const runGenerate = (
    generatorOptions: Record<string, unknown>,
    inputSpec: unknown = 'specs/petstore.json'
  ) =>
    generator.generate(
      {
        inputSpec,
        outputPath: 'libs/api/src',
        generatorOptions,
      } as GenerateOptions,
      ctx
    );

  beforeEach(async () => {
    jest.clearAllMocks();
    generator = new HeyApiGenerator();
    jest
      .spyOn(
        generator as unknown as { cleanOutput: (...a: unknown[]) => void },
        'cleanOutput'
      )
      .mockImplementation(() => undefined);
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    openApiTsGenerate = (
      (await import('@hey-api/openapi-ts')) as unknown as {
        generate: jest.Mock;
      }
    ).generate;
  });

  afterEach(() => warnSpy.mockRestore());

  it('passes other generatorOptions through', async () => {
    await runGenerate({ plugins: ['@hey-api/client-fetch'] });

    expect(openApiTsGenerate).toHaveBeenCalledWith({
      input: '/workspace/specs/petstore.json',
      output: '/workspace/libs/api/src',
      plugins: ['@hey-api/client-fetch'],
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('merges object output and forces resolved path', async () => {
    await runGenerate({
      output: { format: 'prettier', path: 'somewhere/else' },
    });

    expect(openApiTsGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        output: { format: 'prettier', path: '/workspace/libs/api/src' },
      })
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('forces per-service path for object output with multiple specs', async () => {
    await runGenerate(
      { output: { lint: 'eslint' } },
      { users: 'specs/users.json', orders: 'specs/orders.json' }
    );

    expect(openApiTsGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        output: { lint: 'eslint', path: '/workspace/libs/api/src/users' },
      })
    );
    expect(openApiTsGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        output: { lint: 'eslint', path: '/workspace/libs/api/src/orders' },
      })
    );
  });

  it.each([
    ['string', 'other/dir'],
    ['array', ['a', 'b']],
    ['null', null],
  ])('ignores %s output with a warning', async (_kind, output) => {
    await runGenerate({ output });

    expect(openApiTsGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ output: '/workspace/libs/api/src' })
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('outputPath'));
  });

  it('ignores input with a warning', async () => {
    await runGenerate({ input: 'other/spec.json' });

    expect(openApiTsGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ input: '/workspace/specs/petstore.json' })
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('inputSpec'));
  });
});
