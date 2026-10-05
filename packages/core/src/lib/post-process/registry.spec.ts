import { PostProcessorRegistry } from './registry';
import { PostProcessorNotFoundError } from './errors';

describe('PostProcessorRegistry', () => {
  beforeEach(() => {
    (
      PostProcessorRegistry as unknown as {
        _instance: PostProcessorRegistry | null;
      }
    )._instance = null;
  });

  it('returns a singleton', () => {
    expect(PostProcessorRegistry.instance()).toBe(
      PostProcessorRegistry.instance()
    );
  });

  it('registers built-ins', () => {
    expect(PostProcessorRegistry.instance().list()).toEqual(['split']);
  });

  it('registers and resolves post-processors', () => {
    const registry = PostProcessorRegistry.instance();
    const postProcessor = { name: 'noop', run: jest.fn() };
    registry.register(postProcessor);

    expect(registry.has('noop')).toBe(true);
    expect(registry.get('noop')).toBe(postProcessor);
    expect(registry.list()).toEqual(['split', 'noop']);
  });

  it('throws for unknown post-processors', () => {
    expect(() => PostProcessorRegistry.instance().get('missing')).toThrow(
      PostProcessorNotFoundError
    );
  });
});
