import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HeyApiGenerator } from './hey-api-generator';
import { GeneratorContext } from '@nx-plugin-openapi/core';

jest.mock('@nx/devkit', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));

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

async function openApiTsGenerate(): Promise<jest.Mock> {
  return (
    (await import('@hey-api/openapi-ts')) as unknown as { generate: jest.Mock }
  ).generate;
}

describe('HeyApiGenerator', () => {
  let generator: HeyApiGenerator;
  let mockContext: GeneratorContext;
  let cleanOutputSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new HeyApiGenerator();
    mockContext = { root: '/workspace', workspaceName: 'test' };
    // Spy on cleanOutput inherited from BaseGenerator
    cleanOutputSpy = jest
      .spyOn(
        generator as unknown as { cleanOutput: (...a: unknown[]) => void },
        'cleanOutput'
      )
      .mockImplementation(() => {});
  });

  it('should have correct plugin name', () => {
    expect(generator.name).toBe('hey-api');
  });

  it('should call openapi-ts generate for single spec', async () => {
    const mod = (await import('@hey-api/openapi-ts')) as unknown as {
      generate: jest.Mock;
    };

    await generator.generate(
      {
        inputSpec: 'api.yaml',
        outputPath: 'src/generated',
        generatorOptions: { client: 'fetch' },
      } as unknown as Parameters<HeyApiGenerator['generate']>[0],
      mockContext
    );

    expect(cleanOutputSpy).toHaveBeenCalledWith(mockContext, 'src/generated');
    expect(mod.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: '/workspace/api.yaml',
        output: '/workspace/src/generated',
        client: 'fetch',
      })
    );
  });

  it('should call openapi-ts generate for multiple specs', async () => {
    const mod = (await import('@hey-api/openapi-ts')) as unknown as {
      generate: jest.Mock;
    };

    await generator.generate(
      {
        inputSpec: { users: 'users.yaml', products: 'products.yaml' },
        outputPath: 'src/api',
      } as unknown as Parameters<HeyApiGenerator['generate']>[0],
      mockContext
    );

    expect(cleanOutputSpy).toHaveBeenCalledTimes(2);
    expect(mod.generate).toHaveBeenCalledTimes(2);
    expect(mod.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: '/workspace/users.yaml',
        output: '/workspace/src/api/users',
      })
    );
    expect(mod.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: '/workspace/products.yaml',
        output: '/workspace/src/api/products',
      })
    );
  });

  it('passes generatorOptions to every service of a record inputSpec', async () => {
    const generate = await openApiTsGenerate();

    await generator.generate(
      {
        inputSpec: { users: 'users.yaml', products: 'products.yaml' },
        outputPath: 'src/api',
        generatorOptions: { plugins: ['@hey-api/client-fetch'] },
      } as unknown as GenerateOptions,
      mockContext
    );

    expect(generate).toHaveBeenCalledTimes(2);
    for (const [config] of generate.mock.calls) {
      expect(config).toMatchObject({ plugins: ['@hey-api/client-fetch'] });
    }
  });

  it('passes only input and output without generatorOptions', async () => {
    const generate = await openApiTsGenerate();

    await generator.generate(
      { inputSpec: 'api.yaml', outputPath: 'src/generated' } as GenerateOptions,
      mockContext
    );

    expect(generate).toHaveBeenCalledWith({
      input: '/workspace/api.yaml',
      output: '/workspace/src/generated',
    });
  });

  it('cleans each service output right before generating it', async () => {
    const generate = await openApiTsGenerate();

    await generator.generate(
      {
        inputSpec: { users: 'users.yaml', products: 'products.yaml' },
        outputPath: 'src/api',
      } as unknown as GenerateOptions,
      mockContext
    );

    expect(cleanOutputSpy).toHaveBeenNthCalledWith(
      1,
      mockContext,
      'src/api/users'
    );
    expect(cleanOutputSpy).toHaveBeenNthCalledWith(
      2,
      mockContext,
      'src/api/products'
    );
    const [cleanUsers, cleanProducts] = cleanOutputSpy.mock.invocationCallOrder;
    const [generateUsers, generateProducts] = generate.mock.invocationCallOrder;
    expect(cleanUsers).toBeLessThan(generateUsers);
    expect(generateUsers).toBeLessThan(cleanProducts);
    expect(cleanProducts).toBeLessThan(generateProducts);
  });

  it('generates nothing for an empty record inputSpec', async () => {
    const generate = await openApiTsGenerate();

    await generator.generate(
      { inputSpec: {}, outputPath: 'src/api' } as unknown as GenerateOptions,
      mockContext
    );

    expect(cleanOutputSpy).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });

  it('propagates errors thrown by hey-api', async () => {
    const generate = await openApiTsGenerate();
    const failure = new Error('Invalid OpenAPI spec');
    generate.mockRejectedValueOnce(failure);

    await expect(
      generator.generate(
        {
          inputSpec: 'api.yaml',
          outputPath: 'src/generated',
        } as GenerateOptions,
        mockContext
      )
    ).rejects.toBe(failure);
  });

  it('stops at the first failing service of a record inputSpec', async () => {
    const generate = await openApiTsGenerate();
    generate.mockRejectedValueOnce(new Error('users spec is broken'));

    await expect(
      generator.generate(
        {
          inputSpec: { users: 'users.yaml', products: 'products.yaml' },
          outputPath: 'src/api',
        } as unknown as GenerateOptions,
        mockContext
      )
    ).rejects.toThrow('users spec is broken');

    expect(generate).toHaveBeenCalledTimes(1);
    expect(cleanOutputSpy).toHaveBeenCalledTimes(1);
  });
});

describe('HeyApiGenerator output cleaning', () => {
  let root: string;
  let generator: HeyApiGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    root = mkdtempSync(join(tmpdir(), 'hey-api-clean-'));
    generator = new HeyApiGenerator();
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('removes stale files before hey-api writes the new output', async () => {
    const generate = await openApiTsGenerate();
    const staleFile = join(root, 'src/generated/stale.gen.ts');
    mkdirSync(join(root, 'src/generated'), { recursive: true });
    writeFileSync(staleFile, '');
    let staleFileExistedDuringGenerate: boolean | undefined;
    generate.mockImplementationOnce(async () => {
      staleFileExistedDuringGenerate = existsSync(staleFile);
    });

    await generator.generate(
      { inputSpec: 'api.yaml', outputPath: 'src/generated' } as GenerateOptions,
      { root, workspaceName: 'test' }
    );

    expect(staleFileExistedDuringGenerate).toBe(false);
  });

  it('refuses to clean the workspace root and skips generation', async () => {
    const generate = await openApiTsGenerate();

    await expect(
      generator.generate(
        { inputSpec: 'api.yaml', outputPath: '.' } as GenerateOptions,
        { root, workspaceName: 'test' }
      )
    ).rejects.toThrow(/Cannot clean empty or root output path/);

    expect(existsSync(root)).toBe(true);
    expect(generate).not.toHaveBeenCalled();
  });
});
