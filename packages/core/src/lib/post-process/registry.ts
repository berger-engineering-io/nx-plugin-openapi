import { PostProcessor } from '../interfaces';
import { PostProcessorNotFoundError } from './errors';

/**
 * Post-processors shipped with core, registered on first registry access.
 * Empty for now; add built-ins here.
 */
const BUILTIN_POST_PROCESSORS: PostProcessor[] = [];

export class PostProcessorRegistry {
  private static _instance: PostProcessorRegistry | null = null;
  static instance(): PostProcessorRegistry {
    if (!this._instance) {
      const registry = new PostProcessorRegistry();
      BUILTIN_POST_PROCESSORS.forEach((p) => registry.register(p));
      this._instance = registry;
    }
    return this._instance;
  }

  private postProcessors = new Map<string, PostProcessor>();

  register(postProcessor: PostProcessor): void {
    this.postProcessors.set(postProcessor.name, postProcessor);
  }

  has(name: string): boolean {
    return this.postProcessors.has(name);
  }

  get(name: string): PostProcessor {
    const postProcessor = this.postProcessors.get(name);
    if (!postProcessor) throw new PostProcessorNotFoundError(name);
    return postProcessor;
  }

  list(): string[] {
    return Array.from(this.postProcessors.keys());
  }
}
