import { ExecutorContext, logger, PromiseExecutor } from '@nx/devkit';
import { GeneratorRegistry } from '../../lib/registry';
import { loadPlugin } from '../../lib/plugin-loader';
import { CoreGenerateApiExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<CoreGenerateApiExecutorSchema> = async (
  options,
  context: ExecutorContext
) => {
  const {
    generator = 'openapi-tools',
    inputSpec,
    outputPath,
    generatorOptions,
  } = options;
  try {
    // Ensure plugin is available (load + register if needed)
    if (!GeneratorRegistry.instance().has(generator)) {
      const plugin = await loadPlugin(generator);
      GeneratorRegistry.instance().register(plugin);
    }

    const plugin = GeneratorRegistry.instance().get(generator);

    // Validate if plugin offers it
    if (typeof plugin.validate === 'function') {
      await plugin.validate({ inputSpec, outputPath, generatorOptions } as any);
    }

    // Execute
    await plugin.generate({ inputSpec, outputPath, generatorOptions } as any, {
      root: context.root,
      workspaceName: context.projectName,
    });

    logger.info(`Finished generating API using '${generator}'`);
    return { success: true };
  } catch (e) {
    logger.error(`API generation failed using '${generator}'`);
    logger.error(e as any);
    return { success: false };
  }
};

export default runExecutor;
