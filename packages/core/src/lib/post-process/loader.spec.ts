// Native import() is unavailable in jest's vm; route it through jest's require
// so jest.mock'ed virtual modules are resolved.
jest.mock('../utils/dynamic-import', () => ({
  dynamicImport: jest.fn((specifier: string) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Promise.resolve().then(() => require(specifier))
  ),
}));
jest.mock(
  'pp-default-export',
  () => ({ default: { name: 'pp-default-export', run: jest.fn() } }),
  { virtual: true }
);
jest.mock(
  'pp-named-export',
  () => ({ postProcessor: { name: 'other-name', run: jest.fn() } }),
  { virtual: true }
);
jest.mock(
  'pp-factory-export',
  () => ({
    createPostProcessor: () => ({ name: 'pp-factory-export', run: jest.fn() }),
  }),
  { virtual: true }
);
jest.mock(
  'pp-cjs-interop',
  () => ({
    default: {
      __esModule: true,
      default: { name: 'pp-cjs-interop', run: jest.fn() },
    },
  }),
  { virtual: true }
);
jest.mock(
  'pp-cjs-factory',
  () => ({
    default: {
      createPostProcessor: () => ({ name: 'pp-cjs-factory', run: jest.fn() }),
    },
  }),
  { virtual: true }
);
jest.mock('pp-invalid-export', () => ({ something: 1 }), { virtual: true });

import {
  extractPostProcessor,
  isPostProcessor,
  loadPostProcessor,
} from './loader';
import { PostProcessorRegistry } from './registry';
import { PostProcessorLoadError, PostProcessorNotFoundError } from './errors';
import { dynamicImport } from '../utils/dynamic-import';

describe('post-processor loader', () => {
  beforeEach(() => {
    (
      PostProcessorRegistry as unknown as {
        _instance: PostProcessorRegistry | null;
      }
    )._instance = null;
  });

  describe('isPostProcessor', () => {
    it('accepts objects with name and run', () => {
      expect(isPostProcessor({ name: 'x', run: () => undefined })).toBe(true);
    });

    it.each([undefined, null, {}, { name: 'x' }, { run: () => undefined }])(
      'rejects %p',
      (value) => expect(isPostProcessor(value)).toBe(false)
    );
  });

  describe('extractPostProcessor', () => {
    it('returns undefined without valid export', () => {
      expect(extractPostProcessor({ default: 42 })).toBeUndefined();
    });
  });

  describe('loadPostProcessor', () => {
    it('prefers the registry', async () => {
      const registered = { name: 'registered', run: jest.fn() };
      PostProcessorRegistry.instance().register(registered);

      await expect(loadPostProcessor('registered')).resolves.toBe(registered);
    });

    it('loads default export from package and caches it', async () => {
      const loaded = await loadPostProcessor('pp-default-export');

      expect(dynamicImport).toHaveBeenCalledWith('pp-default-export');
      expect(loaded.name).toBe('pp-default-export');
      expect(PostProcessorRegistry.instance().has('pp-default-export')).toBe(
        true
      );
    });

    it('loads named export and registers under the package name', async () => {
      const loaded = await loadPostProcessor('pp-named-export');

      expect(loaded.name).toBe('pp-named-export');
      expect(PostProcessorRegistry.instance().has('pp-named-export')).toBe(
        true
      );
    });

    it('loads from factory export', async () => {
      const loaded = await loadPostProcessor('pp-factory-export');

      expect(loaded.name).toBe('pp-factory-export');
    });

    it('unwraps CJS default.default from native import', async () => {
      const loaded = await loadPostProcessor('pp-cjs-interop');

      expect(loaded.name).toBe('pp-cjs-interop');
    });

    it('loads factory export nested in CJS default', async () => {
      const loaded = await loadPostProcessor('pp-cjs-factory');

      expect(loaded.name).toBe('pp-cjs-factory');
    });

    it('throws load error for invalid exports', async () => {
      await expect(loadPostProcessor('pp-invalid-export')).rejects.toThrow(
        PostProcessorLoadError
      );
    });

    it('throws not found error for missing packages', async () => {
      await expect(
        loadPostProcessor('pp-does-not-exist-anywhere')
      ).rejects.toThrow(PostProcessorNotFoundError);
    });
  });
});
