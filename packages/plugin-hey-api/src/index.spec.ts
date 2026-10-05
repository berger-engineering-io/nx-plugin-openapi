import { isGeneratorPlugin } from '@nx-plugin-openapi/core';
import plugin, { HeyApiGenerator, HeyApiPlugin } from './index';

describe('plugin-hey-api entry point', () => {
  it('default-exports a ready-to-use generator plugin', () => {
    expect(plugin).toBeInstanceOf(HeyApiGenerator);
    expect(isGeneratorPlugin(plugin)).toBe(true);
    expect(plugin.name).toBe('hey-api');
  });

  it('exposes the same instance as HeyApiPlugin', () => {
    expect(HeyApiPlugin).toBe(plugin);
  });

  it('supports classification for post-processors', () => {
    expect(typeof plugin.classify).toBe('function');
  });
});
