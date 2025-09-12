import { HeyOpenApiGenerator } from './hey-openapi-generator';
import { GeneratorContext } from '@nx-plugin-openapi/core';

jest.mock('@hey-api/openapi-ts', () => ({
  generate: jest.fn(async () => undefined),
}));

describe('HeyOpenApiGenerator', () => {
  let generator: HeyOpenApiGenerator;
  let mockContext: GeneratorContext;
  let cleanOutputSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new HeyOpenApiGenerator();
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
    expect(generator.name).toBe('hey-openapi');
  });

  it('should call openapi-ts generate for single spec', async () => {
    const { generate } = (await import('@hey-api/openapi-ts')) as any;

    await generator.generate(
      {
        inputSpec: 'api.yaml',
        outputPath: 'src/generated',
        generatorOptions: { client: 'fetch' },
      } as any,
      mockContext
    );

    expect(cleanOutputSpy).toHaveBeenCalledWith(mockContext, 'src/generated');
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: 'api.yaml',
        output: '/workspace/src/generated',
        client: 'fetch',
      })
    );
  });

  it('should call openapi-ts generate for multiple specs', async () => {
    const { generate } = (await import('@hey-api/openapi-ts')) as any;

    await generator.generate(
      {
        inputSpec: { users: 'users.yaml', products: 'products.yaml' },
        outputPath: 'src/api',
      } as any,
      mockContext
    );

    expect(cleanOutputSpy).toHaveBeenCalledTimes(2);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: 'users.yaml',
        output: '/workspace/src/api/users',
      })
    );
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: 'products.yaml',
        output: '/workspace/src/api/products',
      })
    );
  });
});
