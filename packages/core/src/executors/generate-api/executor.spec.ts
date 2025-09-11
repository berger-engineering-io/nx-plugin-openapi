import { ExecutorContext } from '@nx/devkit';

jest.mock('../../lib/plugin-loader', () => ({
  loadPlugin: jest.fn(),
}));

import { loadPlugin } from '../../lib/plugin-loader';
import { GeneratorRegistry } from '../../lib/registry';
import { GeneratorPlugin } from '../../lib/interfaces';
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
});
