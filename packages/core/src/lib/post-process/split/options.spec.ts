import { PostProcessContext } from '../../interfaces';
import { SplitError } from './errors';
import { resolveSplitUnits } from './options';

const aliases = { types: '@acme/types', api: '@acme/api', core: '@acme/core' };

function buildContext(
  overrides: Partial<PostProcessContext> = {}
): PostProcessContext {
  return {
    root: '/ws',
    outputPath: 'libs/petstore/generated',
    absoluteOutputPath: '/ws/libs/petstore/generated',
    inputSpec: 'spec.json',
    generatorName: 'gen',
    generator: { name: 'gen', generate: jest.fn() },
    ...overrides,
  };
}

describe('resolveSplitUnits', () => {
  it('defaults targetRoot to the output path', () => {
    expect(resolveSplitUnits(buildContext(), { aliases })).toEqual([
      {
        sourceDir: '/ws/libs/petstore/generated',
        targetDir: '/ws/libs/petstore/generated',
        aliases,
      },
    ]);
  });

  it('resolves targetRoot against the workspace root', () => {
    const [unit] = resolveSplitUnits(buildContext(), {
      aliases,
      targetRoot: 'libs/petstore',
    });

    expect(unit.targetDir).toBe('/ws/libs/petstore');
  });

  it('rejects targetRoot outside the workspace', () => {
    expect(() =>
      resolveSplitUnits(buildContext(), { aliases, targetRoot: '../x' })
    ).toThrow(SplitError);
  });

  it.each([
    [undefined],
    [{ types: '@a/types', api: '@a/api' }],
    [{ types: '@a/x', api: '@a/x', core: '@a/core' }],
  ])('rejects invalid aliases %p', (invalidAliases) => {
    expect(() =>
      resolveSplitUnits(buildContext(), {
        aliases: invalidAliases as never,
      })
    ).toThrow(/aliases/);
  });

  describe('multiple input specs', () => {
    const ctx = buildContext({
      inputSpec: { pets: 'pets.json', users: 'users.json' },
    });

    it('creates one unit per service', () => {
      const units = resolveSplitUnits(ctx, {
        aliases: {
          types: '@acme/{service}-types',
          api: '@acme/{service}-api',
          core: '@acme/{service}-core',
        },
      });

      expect(units).toEqual([
        {
          service: 'pets',
          sourceDir: '/ws/libs/petstore/generated/pets',
          targetDir: '/ws/libs/petstore/generated/pets',
          aliases: {
            types: '@acme/pets-types',
            api: '@acme/pets-api',
            core: '@acme/pets-core',
          },
        },
        expect.objectContaining({
          service: 'users',
          targetDir: '/ws/libs/petstore/generated/users',
        }),
      ]);
    });

    it('requires the service placeholder', () => {
      expect(() => resolveSplitUnits(ctx, { aliases })).toThrow(/\{service\}/);
    });
  });
});
