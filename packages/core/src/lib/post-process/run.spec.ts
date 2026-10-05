import { createPostProcessContext, runPostProcessors } from './run';
import { PostProcessorRegistry } from './registry';
import { PostProcessError, PostProcessorNotFoundError } from './errors';
import { GeneratorPlugin, PostProcessContext } from '../interfaces';

const generator: GeneratorPlugin = { name: 'gen', generate: jest.fn() };

function buildContext(outputPath = 'libs/api/src'): PostProcessContext {
  return createPostProcessContext({
    root: '/ws',
    projectName: 'demo',
    outputPath,
    inputSpec: 'spec.json',
    generatorName: 'gen',
    generator,
  });
}

describe('createPostProcessContext', () => {
  it('resolves relative output path', () => {
    const ctx = buildContext('libs/api/src');

    expect(ctx.absoluteOutputPath).toBe('/ws/libs/api/src');
    expect(ctx.outputPath).toBe('libs/api/src');
    expect(ctx.generator).toBe(generator);
    expect(ctx.projectName).toBe('demo');
  });

  it('keeps absolute output path and derives relative one', () => {
    const ctx = buildContext('/ws/libs/api/src');

    expect(ctx.absoluteOutputPath).toBe('/ws/libs/api/src');
    expect(ctx.outputPath).toBe('libs/api/src');
  });
});

describe('runPostProcessors', () => {
  beforeEach(() => {
    (
      PostProcessorRegistry as unknown as {
        _instance: PostProcessorRegistry | null;
      }
    )._instance = null;
  });

  it('does nothing without steps', async () => {
    await expect(
      runPostProcessors(undefined, buildContext())
    ).resolves.toBeUndefined();
  });

  it('runs steps in order with their options', async () => {
    const calls: string[] = [];
    const first = {
      name: 'first',
      run: jest.fn(async () => {
        calls.push('first');
      }),
    };
    const second = {
      name: 'second',
      run: jest.fn(() => {
        calls.push('second');
      }),
    };
    PostProcessorRegistry.instance().register(first);
    PostProcessorRegistry.instance().register(second);
    const ctx = buildContext();

    await runPostProcessors(
      [{ name: 'first', options: { a: 1 } }, { name: 'second' }],
      ctx
    );

    expect(calls).toEqual(['first', 'second']);
    expect(first.run).toHaveBeenCalledWith(ctx, { a: 1 });
    expect(second.run).toHaveBeenCalledWith(ctx, {});
  });

  it('wraps failures and stops', async () => {
    const after = { name: 'after', run: jest.fn() };
    PostProcessorRegistry.instance().register({
      name: 'failing',
      run: () => {
        throw new Error('boom');
      },
    });
    PostProcessorRegistry.instance().register(after);

    await expect(
      runPostProcessors(
        [{ name: 'failing' }, { name: 'after' }],
        buildContext()
      )
    ).rejects.toThrow(PostProcessError);
    expect(after.run).not.toHaveBeenCalled();
  });

  it('fails for unknown post-processors', async () => {
    await expect(
      runPostProcessors([{ name: 'pp-unknown-xyz' }], buildContext())
    ).rejects.toThrow(PostProcessorNotFoundError);
  });
});
