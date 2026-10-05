import { HeyApiGenerator } from './hey-api-generator';
import { GeneratorContext } from '@nx-plugin-openapi/core';
import { dynamicImport } from './utils/dynamic-import';

jest.mock('./utils/dynamic-import', () => ({
  dynamicImport: jest.fn(),
}));

const mockedDynamicImport = dynamicImport as jest.MockedFunction<
  typeof dynamicImport
>;

describe('HeyApiGenerator ESM import', () => {
  const ctx: GeneratorContext = { root: '/workspace', workspaceName: 'test' };
  const options = {
    inputSpec: '/specs/api.yaml',
    outputPath: 'src/generated',
  } as unknown as Parameters<HeyApiGenerator['generate']>[0];
  let generator: HeyApiGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new HeyApiGenerator();
    jest
      .spyOn(
        generator as unknown as { cleanOutput: (...a: unknown[]) => void },
        'cleanOutput'
      )
      .mockImplementation(() => undefined);
  });

  it('should load @hey-api/openapi-ts via native dynamic import', async () => {
    const generate = jest.fn(async () => undefined);
    mockedDynamicImport.mockResolvedValue({ generate });

    await generator.generate(options, ctx);

    expect(mockedDynamicImport).toHaveBeenCalledWith('@hey-api/openapi-ts');
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ input: '/specs/api.yaml' })
    );
  });

  it('should prefer named ESM export over default', async () => {
    const generate = jest.fn(async () => undefined);
    const defaultGenerate = jest.fn(async () => undefined);
    mockedDynamicImport.mockResolvedValue({
      generate,
      default: { generate: defaultGenerate },
    });

    await generator.generate(options, ctx);

    expect(generate).toHaveBeenCalled();
    expect(defaultGenerate).not.toHaveBeenCalled();
  });

  it('should fall back to CJS module.exports exposed as default', async () => {
    const generate = jest.fn(async () => undefined);
    mockedDynamicImport.mockResolvedValue({ default: { generate } });

    await generator.generate(options, ctx);

    expect(generate).toHaveBeenCalled();
  });

  it('should use createClient when generate is missing', async () => {
    const createClient = jest.fn(async () => undefined);
    mockedDynamicImport.mockResolvedValue({ createClient });

    await generator.generate(options, ctx);

    expect(createClient).toHaveBeenCalled();
  });

  it('should report missing package with install hint', async () => {
    mockedDynamicImport.mockRejectedValue(
      new Error("Cannot find package '@hey-api/openapi-ts'")
    );

    await expect(generator.generate(options, ctx)).rejects.toThrow(
      /@hey-api\/openapi-ts is required but not installed/
    );
  });

  it('should list available exports when no supported API exists', async () => {
    mockedDynamicImport.mockResolvedValue({ defineConfig: jest.fn() });

    await expect(generator.generate(options, ctx)).rejects.toThrow(
      /Available: defineConfig/
    );
  });

  it('should prefer generate over createClient', async () => {
    const generate = jest.fn(async () => undefined);
    const createClient = jest.fn(async () => undefined);
    mockedDynamicImport.mockResolvedValue({ generate, createClient });

    await generator.generate(options, ctx);

    expect(generate).toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('should use createClient from a CJS default export', async () => {
    const createClient = jest.fn(async () => undefined);
    mockedDynamicImport.mockResolvedValue({ default: { createClient } });

    await generator.generate(options, ctx);

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ input: '/specs/api.yaml' })
    );
  });

  it('should keep the original error when the import rejects with a non-Error', async () => {
    mockedDynamicImport.mockRejectedValue('ERR_REQUIRE_ESM');

    await expect(generator.generate(options, ctx)).rejects.toThrow(
      /Original error: ERR_REQUIRE_ESM/
    );
  });

  it.each([
    ['a function', { default: jest.fn() }, 'Available: default'],
    ['null', { default: null }, 'Available: default'],
  ])(
    'should reject a default export that is %s',
    async (_label, namespace, message) => {
      mockedDynamicImport.mockResolvedValue(namespace);

      await expect(generator.generate(options, ctx)).rejects.toThrow(message);
    }
  );

  it('should not list __esModule among available exports', async () => {
    mockedDynamicImport.mockResolvedValue({
      default: { __esModule: true, defineConfig: jest.fn() },
    });

    await expect(generator.generate(options, ctx)).rejects.toThrow(
      /Available: defineConfig$/
    );
  });

  it('should reject when generate is not a function', async () => {
    mockedDynamicImport.mockResolvedValue({ generate: 'not-a-function' });

    await expect(generator.generate(options, ctx)).rejects.toThrow(
      /Expected 'generate' or 'createClient'. Available: generate/
    );
  });
});
