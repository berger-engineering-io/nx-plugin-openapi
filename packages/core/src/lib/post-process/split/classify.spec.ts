import { GeneratorPlugin, PostProcessContext } from '../../interfaces';
import { classifyUnit } from './classify';
import { SplitError } from './errors';
import { SplitUnit } from './options';

const unit: SplitUnit = {
  service: 'pets',
  sourceDir: '/ws/out/pets',
  targetDir: '/ws/out/pets',
  aliases: { types: '@a/types', api: '@a/api', core: '@a/core' },
};

function buildContext(generator: GeneratorPlugin): PostProcessContext {
  return {
    root: '/ws',
    outputPath: 'out',
    absoluteOutputPath: '/ws/out',
    inputSpec: { pets: 'pets.json' },
    generatorName: generator.name,
    generator,
    generatorOptions: { generatorName: 'typescript-angular' },
  };
}

describe('classifyUnit', () => {
  it('passes split options, service and generator options to classify', async () => {
    const classify = jest.fn(() => ({
      files: { 'model/pet.ts': 'model' as const },
    }));
    const ctx = buildContext({ name: 'gen', generate: jest.fn(), classify });

    const files = await classifyUnit(ctx, unit, { targetRoot: 'out' });

    expect(files).toEqual({ 'model/pet.ts': 'model' });
    expect(classify).toHaveBeenCalledWith('/ws/out/pets', {
      targetRoot: 'out',
      service: 'pets',
      generatorOptions: { generatorName: 'typescript-angular' },
    });
  });

  it('fails for generators without classify', async () => {
    const ctx = buildContext({ name: 'gen', generate: jest.fn() });

    await expect(classifyUnit(ctx, unit, {})).rejects.toThrow(
      /does not implement classify/
    );
  });

  it.each([
    [{ '../escape.ts': 'model' }],
    [{ '/abs.ts': 'model' }],
    [{ 'a\\b.ts': 'model' }],
    [{ './a.ts': 'model' }],
    [{ 'a.ts': 'unknown' }],
  ])('rejects invalid classification %p', async (files) => {
    const ctx = buildContext({
      name: 'gen',
      generate: jest.fn(),
      classify: () => ({ files: files as never }),
    });

    await expect(classifyUnit(ctx, unit, {})).rejects.toThrow(SplitError);
  });
});
