import { joinPathFragments } from '@nx/devkit';
import { basename, dirname } from 'node:path';
import { SPLIT_GROUPS, SplitGroup } from '../lib/post-process/split/options';

/** File name of a client definition; one file per client. */
export const CLIENT_DEFINITION_FILE = 'openapi-client.json';

/**
 * Content of an `openapi-client.json`. All paths are relative to the
 * directory containing the file.
 */
export interface ClientDefinition {
  /** Client name; inferred project names derive from it. Defaults to the directory name. */
  name?: string;
  /** Local spec file, the committed source of truth. */
  spec: string;
  /** Remote spec URL; enables the inferred `update-spec` target. */
  url?: string;
  /** Request headers for `update-spec`; supports `${ENV_VAR}`. */
  headers?: Record<string, string>;
  /** Format used by `update-spec` when writing the spec. */
  format?: 'raw' | 'json';
  /** Generator plugin, e.g. `openapi-tools`, `hey-api` or a package name. */
  generator?: string;
  generatorOptions?: Record<string, unknown>;
  /** Generator output dir. Defaults to `src`, or `generated` when splitting. */
  output?: string;
  /** Split the output into `types`, `api` and `core` libs. */
  split?: {
    /** Dir receiving the libs. Defaults to the definition dir. */
    targetRoot?: string;
    aliases: Record<SplitGroup, string>;
  };
  /** Tags added to all projects of this client, e.g. `scope:shared`. */
  tags?: string[];
}

/** Client definition with validated values and workspace-relative paths. */
export interface ResolvedClient {
  name: string;
  /** Workspace-relative dir of the definition file (`.` for the root). */
  root: string;
  definitionFile: string;
  spec: string;
  url?: string;
  headers?: Record<string, string>;
  format?: 'raw' | 'json';
  generator: string;
  generatorOptions?: Record<string, unknown>;
  output: string;
  split?: {
    targetRoot: string;
    aliases: Record<SplitGroup, string>;
  };
  tags: string[];
}

const DEFAULT_GENERATOR = 'openapi-tools';

export class ClientDefinitionError extends Error {
  constructor(definitionFile: string, message: string) {
    super(`${definitionFile}: ${message}`);
    this.name = 'ClientDefinitionError';
  }
}

function isRemoteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** Resolves a definition-relative path to a workspace-relative one. */
function toWorkspacePath(
  definitionFile: string,
  root: string,
  path: string,
  field: string
): string {
  const resolved = joinPathFragments(root, path) || '.';
  if (resolved === '..' || resolved.startsWith('../')) {
    throw new ClientDefinitionError(
      definitionFile,
      `'${field}' must stay inside the workspace: ${path}`
    );
  }
  return resolved;
}

function assertNonEmptyString(
  definitionFile: string,
  value: unknown,
  field: string
): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ClientDefinitionError(
      definitionFile,
      `'${field}' must be a non-empty string`
    );
  }
}

function resolveName(
  definitionFile: string,
  root: string,
  name: unknown
): string {
  if (name === undefined && root !== '.') return basename(root);
  assertNonEmptyString(definitionFile, name, 'name');
  return name;
}

function resolveSpec(
  definitionFile: string,
  root: string,
  spec: unknown
): string {
  assertNonEmptyString(definitionFile, spec, 'spec');
  if (isRemoteUrl(spec)) {
    throw new ClientDefinitionError(
      definitionFile,
      `'spec' must be a local file (the committed source of truth); put the remote location into 'url'`
    );
  }
  return toWorkspacePath(definitionFile, root, spec, 'spec');
}

function resolveSplit(
  definitionFile: string,
  root: string,
  split: ClientDefinition['split']
): ResolvedClient['split'] {
  if (!split) return undefined;
  const aliases = (split.aliases ?? {}) as Partial<Record<SplitGroup, string>>;
  for (const group of SPLIT_GROUPS) {
    assertNonEmptyString(
      definitionFile,
      aliases[group],
      `split.aliases.${group}`
    );
  }
  return {
    targetRoot: toWorkspacePath(
      definitionFile,
      root,
      split.targetRoot ?? '.',
      'split.targetRoot'
    ),
    aliases: aliases as Record<SplitGroup, string>,
  };
}

function resolveOutput(
  definitionFile: string,
  root: string,
  output: string | undefined,
  hasSplit: boolean
): string {
  const resolved = toWorkspacePath(
    definitionFile,
    root,
    output ?? (hasSplit ? 'generated' : 'src'),
    'output'
  );
  // Generators clean their output dir; it must never hold the definition or spec.
  if (resolved === root || resolved === '.') {
    throw new ClientDefinitionError(
      definitionFile,
      `'output' must be a sub directory, not the client directory itself`
    );
  }
  return resolved;
}

/**
 * Validates a parsed client definition and resolves all paths relative to
 * the workspace root.
 */
export function resolveClientDefinition(
  definitionFile: string,
  definition: ClientDefinition
): ResolvedClient {
  if (!definition || typeof definition !== 'object') {
    throw new ClientDefinitionError(definitionFile, 'must contain an object');
  }
  const root = dirname(definitionFile);
  const split = resolveSplit(definitionFile, root, definition.split);
  return {
    name: resolveName(definitionFile, root, definition.name),
    root,
    definitionFile,
    spec: resolveSpec(definitionFile, root, definition.spec),
    url: definition.url,
    headers: definition.headers,
    format: definition.format,
    generator: definition.generator ?? DEFAULT_GENERATOR,
    generatorOptions: definition.generatorOptions,
    output: resolveOutput(definitionFile, root, definition.output, !!split),
    split,
    tags: definition.tags ?? [],
  };
}
