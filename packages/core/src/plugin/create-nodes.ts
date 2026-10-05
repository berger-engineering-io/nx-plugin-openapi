import {
  CreateNodesContextV2,
  CreateNodesResult,
  CreateNodesV2,
  createNodesFromFiles,
  ProjectConfiguration,
  readJsonFile,
  TargetConfiguration,
  TargetDependencyConfig,
} from '@nx/devkit';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SPLIT_GROUPS, SplitGroup } from '../lib/post-process/split/options';
import {
  CLIENT_DEFINITION_FILE,
  ClientDefinition,
  resolveClientDefinition,
  ResolvedClient,
} from './client-definition';

export interface OpenApiPluginOptions {
  /** Name of the inferred generate target. Default: `generate`. */
  generateTargetName?: string;
  /** Name of the inferred update-spec target. Default: `update-spec`. */
  updateSpecTargetName?: string;
  /** Tags added to every inferred project. */
  tags?: string[];
  /**
   * Targets of the split libs that run the client's generate target first.
   * Merged into targets inferred by other plugins via Nx's `'...'` spread.
   * Default: `['build', 'typecheck']`.
   */
  dependentTargets?: string[];
}

type NormalizedOptions = Required<OpenApiPluginOptions>;

/** Fixed tag per split lib, used for Nx module boundaries. */
export const SPLIT_LIB_TAGS: Record<SplitGroup, string> = {
  types: 'type:types',
  api: 'type:api',
  core: 'type:util',
};

const GENERATE_EXECUTOR = '@nx-plugin-openapi/core:generate-api';
const UPDATE_SPEC_EXECUTOR = '@nx-plugin-openapi/core:update-spec';

function normalizeOptions(
  options: OpenApiPluginOptions | undefined
): NormalizedOptions {
  return {
    generateTargetName: options?.generateTargetName ?? 'generate',
    updateSpecTargetName: options?.updateSpecTargetName ?? 'update-spec',
    tags: options?.tags ?? [],
    dependentTargets: options?.dependentTargets ?? ['build', 'typecheck'],
  };
}

function uniqueTags(...tagLists: string[][]): string[] {
  return [...new Set(tagLists.flat())];
}

/**
 * Name of a project already defined in `<projectRoot>/project.json` or
 * `package.json`. Nx merges inferred and explicit config by root, and the
 * explicit name wins, so references must use it.
 */
function readExplicitProjectName(
  workspaceRoot: string,
  projectRoot: string
): string | undefined {
  for (const file of ['project.json', 'package.json']) {
    const path = join(workspaceRoot, projectRoot, file);
    if (existsSync(path)) {
      const name = readJsonFile<{ name?: string }>(path).name;
      if (name) return name;
    }
  }
  return undefined;
}

function workspacePath(path: string): string {
  return `{workspaceRoot}/${path}`;
}

function libRoot(client: ResolvedClient, group: SplitGroup): string {
  const targetRoot = client.split?.targetRoot ?? client.root;
  return targetRoot === '.' ? group : `${targetRoot}/${group}`;
}

function createGenerateTarget(client: ResolvedClient): TargetConfiguration {
  const configFile = client.generatorOptions?.['configFile'];
  const inputs = [
    workspacePath(client.definitionFile),
    workspacePath(client.spec),
    ...(typeof configFile === 'string' ? [workspacePath(configFile)] : []),
  ];
  const libOutputs = client.split
    ? SPLIT_GROUPS.map((group) =>
        workspacePath(`${libRoot(client, group)}/src`)
      )
    : [];
  return {
    executor: GENERATE_EXECUTOR,
    cache: true,
    inputs,
    outputs: [workspacePath(client.output), ...libOutputs],
    options: {
      generator: client.generator,
      inputSpec: client.spec,
      outputPath: client.output,
      ...(client.generatorOptions && {
        generatorOptions: client.generatorOptions,
      }),
      ...(client.split && {
        postProcess: [
          {
            name: 'split',
            options: {
              targetRoot: client.split.targetRoot,
              aliases: client.split.aliases,
            },
          },
        ],
      }),
    },
  };
}

function createUpdateSpecTarget(
  client: ResolvedClient & { url: string }
): TargetConfiguration {
  return {
    executor: UPDATE_SPEC_EXECUTOR,
    // Downloads remote content; must never be served from cache.
    cache: false,
    options: {
      url: client.url,
      specPath: client.spec,
      ...(client.headers && { headers: client.headers }),
      ...(client.format && { format: client.format }),
    },
    configurations: {
      check: { check: true },
    },
  };
}

function createClientProject(
  client: ResolvedClient,
  projectName: string,
  options: NormalizedOptions
): ProjectConfiguration {
  const targets: Record<string, TargetConfiguration> = {
    [options.generateTargetName]: createGenerateTarget(client),
  };
  if (client.url) {
    targets[options.updateSpecTargetName] = createUpdateSpecTarget({
      ...client,
      url: client.url,
    });
  }
  // Without split, the client project itself holds the generated code.
  const ownTags = client.split ? [] : [SPLIT_LIB_TAGS.api];
  return {
    root: client.root,
    name: projectName,
    projectType: 'library',
    tags: uniqueTags(options.tags, client.tags, ownTags),
    targets,
  };
}

function createLibProject(
  client: ResolvedClient,
  clientProjectName: string,
  group: SplitGroup,
  options: NormalizedOptions
): ProjectConfiguration {
  const root = libRoot(client, group);
  const generateFirst: TargetDependencyConfig = {
    projects: [clientProjectName],
    target: options.generateTargetName,
  };
  return {
    root,
    name: `${client.name}-${group}`,
    projectType: 'library',
    sourceRoot: `${root}/src`,
    tags: uniqueTags(options.tags, client.tags, [SPLIT_LIB_TAGS[group]]),
    implicitDependencies: [clientProjectName],
    targets: Object.fromEntries(
      options.dependentTargets.map((targetName) => [
        targetName,
        // '...' keeps dependsOn inferred by other plugins (e.g. '^build').
        { dependsOn: ['...', generateFirst] } as TargetConfiguration,
      ])
    ),
  };
}

function createNodesForClient(
  definitionFile: string,
  options: NormalizedOptions,
  context: CreateNodesContextV2
): CreateNodesResult {
  const definition = readJsonFile<ClientDefinition>(
    join(context.workspaceRoot, definitionFile)
  );
  const client = resolveClientDefinition(definitionFile, definition);
  const clientProjectName =
    readExplicitProjectName(context.workspaceRoot, client.root) ?? client.name;

  const projects: Record<string, ProjectConfiguration> = {
    [client.root]: createClientProject(client, clientProjectName, options),
  };
  if (client.split) {
    for (const group of SPLIT_GROUPS) {
      const lib = createLibProject(client, clientProjectName, group, options);
      projects[lib.root] = lib;
    }
  }
  return { projects };
}

/**
 * Infers projects from `openapi-client.json` files: the client project with a
 * cached `generate` target (plus `update-spec` when a `url` is set) and, when
 * `split` is configured, the `types`, `api` and `core` libs.
 */
export const createNodesV2: CreateNodesV2<OpenApiPluginOptions> = [
  `**/${CLIENT_DEFINITION_FILE}`,
  (definitionFiles, options, context) => {
    const normalizedOptions = normalizeOptions(options);
    return createNodesFromFiles(
      (definitionFile, _options, fileContext) =>
        createNodesForClient(definitionFile, normalizedOptions, fileContext),
      definitionFiles,
      options,
      context
    );
  },
];
