import { GeneratorPlugin } from './interfaces';
import { PluginLoadError, PluginNotFoundError } from './errors';
import { GeneratorRegistry } from './registry';

const BUILTIN_PLUGIN_MAP: Record<string, string> = {
  'openapi-tools': '@nx-plugin-openapi/plugin-openapi',
};

const cache = new Map<string, GeneratorPlugin>();

function isPlugin(obj: unknown): obj is GeneratorPlugin {
  return (
    !!obj && typeof (obj as { generate?: unknown }).generate === 'function'
  );
}

export async function loadPlugin(
  name: string,
  opts?: { root?: string }
): Promise<GeneratorPlugin> {
  if (GeneratorRegistry.instance().has(name)) {
    return GeneratorRegistry.instance().get(name);
  }
  const cached = cache.get(name);
  if (cached) return cached;

  const pkg = BUILTIN_PLUGIN_MAP[name] ?? name;
  try {
    const mod = (await import(pkg)) as {
      default?: unknown;
      createPlugin?: unknown;
      plugin?: unknown;
      Plugin?: unknown;
    };

    let candidate: unknown = undefined;
    if (isPlugin(mod.default)) {
      candidate = mod.default;
    } else if (typeof mod.createPlugin === 'function') {
      candidate = (mod.createPlugin as () => unknown)();
    } else {
      candidate = mod.plugin ?? mod.Plugin;
    }

    if (!isPlugin(candidate)) {
      throw new PluginLoadError(
        name,
        new Error('Module does not export a plugin')
      );
    }

    cache.set(name, candidate);
    return candidate;
  } catch (e) {
    // Fallback to workspace-relative resolution if provided
    const root = opts?.root ?? process.cwd();
    const candidates: string[] = [];
    if (pkg === '@nx-plugin-openapi/plugin-openapi') {
      candidates.push(
        `${root}/dist/packages/plugin-openapi/src/index.js`,
        `${root}/packages/plugin-openapi/src/index.ts`,
        `${root}/packages/plugin-openapi/src/index.js`
      );
    }
    for (const p of candidates) {
      try {
        const url = `file://${p}`;
        const mod2 = (await import(url)) as { default?: unknown };
        if (isPlugin(mod2?.default)) {
          const plugin2 = mod2.default as GeneratorPlugin;
          cache.set(name, plugin2);
          return plugin2;
        }
      } catch {
        // try next candidate
      }
    }

    const msg = String(e);
    const code = (e as Record<string, unknown>)?.['code'];
    if (code === 'ERR_MODULE_NOT_FOUND' || /Cannot find module/.test(msg)) {
      throw new PluginNotFoundError(name);
    }
    throw new PluginLoadError(name, e);
  }
}
