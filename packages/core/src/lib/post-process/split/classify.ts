import { posix } from 'node:path';
import { GeneratedFileKind, PostProcessContext } from '../../interfaces';
import { SplitError } from './errors';
import { SplitOptions, SplitUnit } from './options';

const FILE_KINDS: readonly GeneratedFileKind[] = [
  'model',
  'api',
  'core',
  'other',
];

function assertValidEntry(path: string, kind: unknown): void {
  const normalized = posix.normalize(path);
  if (
    posix.isAbsolute(path) ||
    path.includes('\\') ||
    normalized !== path ||
    path.startsWith('../')
  ) {
    throw new SplitError(
      `Classification paths must be POSIX paths relative to the output dir, got: '${path}'`
    );
  }
  if (!FILE_KINDS.includes(kind as GeneratedFileKind)) {
    throw new SplitError(
      `Invalid kind '${String(
        kind
      )}' for '${path}', expected one of: ${FILE_KINDS.join(', ')}`
    );
  }
}

/**
 * Asks the generator plugin to classify the files of a split unit.
 * The plugin receives the split options plus `generatorOptions` and, for
 * multi-spec setups, `service`.
 */
export async function classifyUnit(
  ctx: PostProcessContext,
  unit: SplitUnit,
  options: Partial<SplitOptions>
): Promise<Record<string, GeneratedFileKind>> {
  if (typeof ctx.generator.classify !== 'function') {
    throw new SplitError(
      `Generator '${ctx.generatorName}' does not implement classify(), so its output cannot be split`
    );
  }
  const classification = await ctx.generator.classify(unit.sourceDir, {
    ...options,
    service: unit.service,
    generatorOptions: ctx.generatorOptions,
  });
  const files = classification?.files ?? {};
  Object.entries(files).forEach(([path, kind]) => assertValidEntry(path, kind));
  return files;
}
