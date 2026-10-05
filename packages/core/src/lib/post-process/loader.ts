import { logger } from '@nx/devkit';
import { PostProcessor } from '../interfaces';
import { PostProcessorLoadError, PostProcessorNotFoundError } from './errors';
import { PostProcessorRegistry } from './registry';

export type PostProcessorModule = {
  default?: unknown;
  postProcessor?: unknown;
  createPostProcessor?: unknown;
};

export function isPostProcessor(obj: unknown): obj is PostProcessor {
  return (
    !!obj &&
    typeof obj === 'object' &&
    typeof (obj as PostProcessor).name === 'string' &&
    typeof (obj as PostProcessor).run === 'function'
  );
}

function isModuleNotFound(error: unknown): boolean {
  const code = (error as Record<string, unknown>)?.['code'];
  return (
    code === 'ERR_MODULE_NOT_FOUND' ||
    code === 'MODULE_NOT_FOUND' ||
    /Cannot find module/.test(String(error))
  );
}

/**
 * Picks the post-processor from a module. Supported exports, in order:
 * `default`, `postProcessor`, `createPostProcessor()` factory.
 */
export function extractPostProcessor(
  mod: PostProcessorModule
): PostProcessor | undefined {
  if (isPostProcessor(mod.default)) return mod.default;
  if (isPostProcessor(mod.postProcessor)) return mod.postProcessor;
  if (typeof mod.createPostProcessor === 'function') {
    const created = (mod.createPostProcessor as () => unknown)();
    if (isPostProcessor(created)) return created;
  }
  return undefined;
}

async function importPostProcessorModule(
  name: string
): Promise<PostProcessorModule> {
  try {
    return await import(name);
  } catch (e) {
    logger.debug(`Failed to import post-processor ${name}: ${e}`);
    if (isModuleNotFound(e)) throw new PostProcessorNotFoundError(name);
    throw new PostProcessorLoadError(name, e);
  }
}

/**
 * Resolves a post-processor by name: registry first (built-ins and
 * programmatically registered ones), then by importing a package of that
 * name. Imported post-processors are cached in the registry under `name`.
 */
export async function loadPostProcessor(name: string): Promise<PostProcessor> {
  const registry = PostProcessorRegistry.instance();
  if (registry.has(name)) return registry.get(name);

  logger.debug(`Loading post-processor from package: ${name}`);
  const mod = await importPostProcessorModule(name);
  const postProcessor = extractPostProcessor(mod);
  if (!postProcessor) {
    const availableExports = Object.keys(mod).filter((k) => k !== '__esModule');
    throw new PostProcessorLoadError(
      name,
      new Error(
        `Module does not export a valid post-processor. Available exports: ${availableExports.join(
          ', '
        )}`
      )
    );
  }

  // Register under the requested (package) name so the next lookup hits the registry
  const registered =
    postProcessor.name === name
      ? postProcessor
      : { name, run: postProcessor.run.bind(postProcessor) };
  registry.register(registered);
  return registered;
}
