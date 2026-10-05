import { isAbsolute, join, relative } from 'node:path';
import { GeneratedFileKind, PostProcessContext } from '../../interfaces';
import { SplitError } from './errors';

/** Target library of the split post-processor. */
export type SplitGroup = 'types' | 'api' | 'core';

export const SPLIT_GROUPS: readonly SplitGroup[] = ['types', 'api', 'core'];

/** Placeholder replaced by the service name for multi-spec (`inputSpec` object) setups. */
export const SERVICE_PLACEHOLDER = '{service}';

export interface SplitOptions {
  /**
   * Directory (relative to the workspace root) receiving the `types`, `api`
   * and `core` libs. Defaults to the executor `outputPath`.
   */
  targetRoot?: string;
  /** Import path alias per lib, e.g. `{ types: '@acme/petstore-types', ... }`. */
  aliases: Record<SplitGroup, string>;
}

/** Group a {@link GeneratedFileKind} is moved to. `other` files stay in place. */
export const GROUP_BY_KIND: Record<GeneratedFileKind, SplitGroup | undefined> =
  {
    model: 'types',
    api: 'api',
    core: 'core',
    other: undefined,
  };

/** Allowed import edges between groups (module boundaries). */
export const ALLOWED_GROUP_DEPENDENCIES: Record<SplitGroup, SplitGroup[]> = {
  types: [],
  core: ['types'],
  api: ['types', 'core'],
};

/** One unit to split: a single generated client (one per service for multi-spec). */
export interface SplitUnit {
  /** Service name for multi-spec setups. */
  service?: string;
  /** Absolute dir holding the generated files. */
  sourceDir: string;
  /** Absolute dir receiving the `{types,api,core}` libs. */
  targetDir: string;
  /** Import aliases with `{service}` resolved. */
  aliases: Record<SplitGroup, string>;
}

function assertAliases(
  aliases: unknown
): asserts aliases is Record<SplitGroup, string> {
  const record = (aliases ?? {}) as Record<string, unknown>;
  const missing = SPLIT_GROUPS.filter(
    (group) => typeof record[group] !== 'string' || !record[group]
  );
  if (missing.length) {
    throw new SplitError(
      `Option 'aliases' must define a non-empty alias for: ${missing.join(
        ', '
      )}`
    );
  }
  const values = SPLIT_GROUPS.map((group) => record[group]);
  if (new Set(values).size !== values.length) {
    throw new SplitError(`Option 'aliases' must be unique per lib`);
  }
}

function resolveTargetRoot(
  ctx: PostProcessContext,
  targetRoot: string | undefined
): string {
  const absoluteTargetRoot = targetRoot
    ? isAbsolute(targetRoot)
      ? targetRoot
      : join(ctx.root, targetRoot)
    : ctx.absoluteOutputPath;
  const relativeToRoot = relative(ctx.root, absoluteTargetRoot);
  if (relativeToRoot.startsWith('..') || isAbsolute(relativeToRoot)) {
    throw new SplitError(
      `Option 'targetRoot' must be inside the workspace: ${absoluteTargetRoot}`
    );
  }
  return absoluteTargetRoot;
}

function resolveServiceAliases(
  aliases: Record<SplitGroup, string>,
  service: string
): Record<SplitGroup, string> {
  return {
    types: aliases.types.split(SERVICE_PLACEHOLDER).join(service),
    api: aliases.api.split(SERVICE_PLACEHOLDER).join(service),
    core: aliases.core.split(SERVICE_PLACEHOLDER).join(service),
  };
}

/**
 * Validates the options and derives the split units. A single spec yields one
 * unit; a multi-spec `inputSpec` yields one unit per service, placed in
 * `<targetRoot>/<service>/` with `{service}` resolved in the aliases.
 */
export function resolveSplitUnits(
  ctx: PostProcessContext,
  options: Partial<SplitOptions>
): SplitUnit[] {
  assertAliases(options.aliases);
  const aliases = options.aliases;
  const targetRoot = resolveTargetRoot(ctx, options.targetRoot);

  if (typeof ctx.inputSpec === 'string') {
    return [
      { sourceDir: ctx.absoluteOutputPath, targetDir: targetRoot, aliases },
    ];
  }

  const servicesWithoutPlaceholder = SPLIT_GROUPS.filter(
    (group) => !aliases[group].includes(SERVICE_PLACEHOLDER)
  );
  if (servicesWithoutPlaceholder.length) {
    throw new SplitError(
      `Multiple input specs require the '${SERVICE_PLACEHOLDER}' placeholder in every alias (missing in: ${servicesWithoutPlaceholder.join(
        ', '
      )}), e.g. '@acme/${SERVICE_PLACEHOLDER}-types'`
    );
  }
  return Object.keys(ctx.inputSpec).map((service) => ({
    service,
    sourceDir: join(ctx.absoluteOutputPath, service),
    targetDir: join(targetRoot, service),
    aliases: resolveServiceAliases(aliases, service),
  }));
}
