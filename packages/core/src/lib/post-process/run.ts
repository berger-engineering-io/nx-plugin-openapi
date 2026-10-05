import { logger } from '@nx/devkit';
import { isAbsolute, join, relative, sep } from 'node:path';
import {
  GeneratorPlugin,
  InputSpec,
  PostProcessContext,
  PostProcessStep,
} from '../interfaces';
import { PostProcessError } from './errors';
import { loadPostProcessor } from './loader';

export interface CreatePostProcessContextInput {
  root: string;
  projectName?: string;
  outputPath: string;
  inputSpec: InputSpec;
  generatorName: string;
  generator: GeneratorPlugin;
  generatorOptions?: Record<string, unknown>;
}

/**
 * Builds a {@link PostProcessContext}, normalizing `outputPath` into an
 * absolute and a root-relative (POSIX) variant.
 */
export function createPostProcessContext(
  input: CreatePostProcessContextInput
): PostProcessContext {
  const absoluteOutputPath = isAbsolute(input.outputPath)
    ? input.outputPath
    : join(input.root, input.outputPath);
  const outputPath = relative(input.root, absoluteOutputPath)
    .split(sep)
    .join('/');
  return { ...input, outputPath, absoluteOutputPath };
}

/**
 * Runs post-processing steps sequentially, in the given order.
 * Stops at the first failing step and throws a {@link PostProcessError}.
 */
export async function runPostProcessors(
  steps: PostProcessStep[] | undefined,
  ctx: PostProcessContext
): Promise<void> {
  for (const step of steps ?? []) {
    const postProcessor = await loadPostProcessor(step.name);
    logger.info(`Running post-processor '${step.name}'`);
    try {
      await postProcessor.run(ctx, step.options ?? {});
    } catch (e) {
      throw new PostProcessError(step.name, e);
    }
  }
}
