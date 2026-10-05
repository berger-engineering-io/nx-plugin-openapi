import { ExecutorContext } from '@nx/devkit';

jest.mock('../../lib/plugin-loader', () => ({
  loadPlugin: jest.fn(),
}));

import { loadPlugin } from '../../lib/plugin-loader';
import { GeneratorRegistry } from '../../lib/registry';
import { GeneratorPlugin } from '../../lib/interfaces';
import { PostProcessorRegistry } from '../../lib/post-process/registry';
import executor from './executor';

const ctx: ExecutorContext = {
  root: '/ws',
  cwd: '/ws',
  projectName: 'demo',
  isVerbose: false,
  projectsConfigurations: { version: 2, projects: {} },
  nxJsonConfiguration: {},
  projectGraph: { nodes: {}, dependencies: {} },
} as unknown as ExecutorContext;

describe('core generate-api executor', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls plugin generate for single spec', async () => {
    const generate = jest.fn(async () => {});
    (loadPlugin as jest.Mock).mockResolvedValue({
      name: 'test-plugin',
      generate,
    });

    const res = await executor(
      { generator: 'test-plugin', inputSpec: 'a.json', outputPath: 'out' },
      ctx
    );
    expect(res.success).toBe(true);
    expect(generate).toHaveBeenCalledWith(
      { inputSpec: 'a.json', outputPath: 'out', generatorOptions: undefined },
      expect.any(Object)
    );
  });

  it('calls plugin generate for multiple specs', async () => {
    const generate = jest.fn(async () => {});
    // Ensure registry holds our test plugin to avoid loader path
    GeneratorRegistry.instance().register({
      name: 'test-plugin',
      validate: () => {},
      generate,
      getSchema: () => ({}),
    } as unknown as GeneratorPlugin);

    const res = await executor(
      {
        generator: 'test-plugin',
        inputSpec: { a: 'a.json', b: 'b.json' },
        outputPath: 'out',
      },
      ctx
    );
    expect(res.success).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  describe('postProcess', () => {
    function registerGenerator(
      generate: GeneratorPlugin['generate']
    ): GeneratorPlugin {
      const plugin = { name: 'pp-gen', generate } as GeneratorPlugin;
      GeneratorRegistry.instance().register(plugin);
      return plugin;
    }

    it('runs post-processors in order after generation', async () => {
      const calls: string[] = [];
      const plugin = registerGenerator(async () => {
        calls.push('generate');
      });
      const first = {
        name: 'first',
        run: jest.fn(() => void calls.push('first')),
      };
      const second = {
        name: 'second',
        run: jest.fn(() => void calls.push('second')),
      };
      PostProcessorRegistry.instance().register(first);
      PostProcessorRegistry.instance().register(second);

      const res = await executor(
        {
          generator: 'pp-gen',
          inputSpec: 'a.json',
          outputPath: 'out',
          postProcess: [
            { name: 'first', options: { x: 1 } },
            { name: 'second' },
          ],
        },
        ctx
      );

      expect(res.success).toBe(true);
      expect(calls).toEqual(['generate', 'first', 'second']);
      expect(first.run).toHaveBeenCalledWith(
        expect.objectContaining({
          root: '/ws',
          projectName: 'demo',
          outputPath: 'out',
          absoluteOutputPath: '/ws/out',
          inputSpec: 'a.json',
          generatorName: 'pp-gen',
          generator: plugin,
        }),
        { x: 1 }
      );
    });

    it('skips post-processors when generation reports failure', async () => {
      registerGenerator(async () => ({ success: false }));
      const step = { name: 'skipped', run: jest.fn() };
      PostProcessorRegistry.instance().register(step);

      await executor(
        {
          generator: 'pp-gen',
          inputSpec: 'a.json',
          outputPath: 'out',
          postProcess: [{ name: 'skipped' }],
        },
        ctx
      );

      expect(step.run).not.toHaveBeenCalled();
    });

    it('fails when a post-processor fails', async () => {
      registerGenerator(async () => undefined);
      PostProcessorRegistry.instance().register({
        name: 'broken',
        run: () => {
          throw new Error('boom');
        },
      });

      const res = await executor(
        {
          generator: 'pp-gen',
          inputSpec: 'a.json',
          outputPath: 'out',
          postProcess: [{ name: 'broken' }],
        },
        ctx
      );

      expect(res.success).toBe(false);
    });
  });
});
