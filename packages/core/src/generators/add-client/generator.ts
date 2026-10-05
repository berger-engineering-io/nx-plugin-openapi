import {
  formatFiles,
  joinPathFragments,
  logger,
  readJson,
  readNxJson,
  Tree,
  updateJson,
  updateNxJson,
  writeJson,
} from '@nx/devkit';
import { posix } from 'node:path';
import { fetchSpec } from '../../executors/update-spec/executor';
import { SPLIT_GROUPS, SplitGroup } from '../../lib/post-process/split/options';
import {
  CLIENT_DEFINITION_FILE,
  ClientDefinition,
} from '../../plugin/client-definition';
import { addGitIgnoreEntry } from '../utils/add-gitignore-entry';
import { addPrettierIgnoreEntry } from '../utils/add-prettier-ignore-entry';
import { log } from '../utils/log';
import { AddClientGeneratorSchema } from './schema';

export const CORE_PLUGIN = '@nx-plugin-openapi/core/plugin';
const DEFINITION_SCHEMA =
  'node_modules/@nx-plugin-openapi/core/src/plugin/openapi-client.schema.json';
const SPLIT_OUTPUT = 'generated';
const UNSPLIT_OUTPUT = 'src';

interface NormalizedOptions extends AddClientGeneratorSchema {
  directory: string;
  adapter: 'openapi-tools' | 'hey-api';
  split: boolean;
  addToGitignore: boolean;
}

function normalizeOptions(
  options: AddClientGeneratorSchema
): NormalizedOptions {
  return {
    ...options,
    directory: joinPathFragments(options.directory),
    adapter: options.adapter ?? 'openapi-tools',
    split: options.split ?? true,
    addToGitignore: options.addToGitignore ?? true,
  };
}

function isRemoteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** Path from the client directory, as stored in the definition. */
function relativeToClient(directory: string, path: string): string {
  return posix.relative(directory, path) || '.';
}

function specExtension(content: string): 'json' | 'yaml' {
  return content.trimStart().startsWith('{') ? 'json' : 'yaml';
}

interface ResolvedSpec {
  path: string;
  /** Content of a downloaded remote spec, written verbatim. */
  downloadedContent?: string;
}

/** Downloads a remote spec once; the committed file is the source of truth. */
async function downloadSpec(options: NormalizedOptions): Promise<ResolvedSpec> {
  const content = await fetchSpec(options.spec, {});
  const path = joinPathFragments(
    options.directory,
    `${options.name}.openapi.${specExtension(content)}`
  );
  return { path, downloadedContent: content };
}

async function resolveSpec(
  tree: Tree,
  options: NormalizedOptions
): Promise<ResolvedSpec> {
  if (isRemoteUrl(options.spec)) return downloadSpec(options);
  const path = joinPathFragments(options.spec);
  if (!tree.exists(path)) {
    throw new Error(log(`Spec file not found: ${path}`));
  }
  return { path };
}

/**
 * Writes a downloaded spec unformatted and keeps prettier away from it, so
 * `update-spec --check` compares against the exact remote content.
 */
function writeDownloadedSpec(tree: Tree, spec: ResolvedSpec): void {
  if (spec.downloadedContent === undefined) return;
  tree.write(spec.path, spec.downloadedContent);
  addPrettierIgnoreEntry({ tree, entry: spec.path });
}

/**
 * A project without any tracked file breaks task hashing. The lib `src` dirs
 * are generated (and usually gitignored), so each lib gets a README.
 */
function writeLibReadmes(tree: Tree, options: NormalizedOptions): void {
  for (const group of SPLIT_GROUPS) {
    tree.write(
      joinPathFragments(options.directory, group, 'README.md'),
      `# ${options.name}-${group}\n\nGenerated ${group} lib of the \`${options.name}\` OpenAPI client. Do not edit \`src\`; run \`nx run ${options.name}:generate\`.\n`
    );
  }
}

/** npm scope of the root package.json, e.g. `@acme` for `@acme/source`. */
function readNpmScope(tree: Tree): string | undefined {
  if (!tree.exists('package.json')) return undefined;
  const { name } = readJson<{ name?: string }>(tree, 'package.json');
  return name?.startsWith('@') ? name.split('/')[0] : undefined;
}

function createAliases(
  tree: Tree,
  options: NormalizedOptions
): Record<SplitGroup, string> {
  const prefix = options.importPrefix ?? readNpmScope(tree);
  return Object.fromEntries(
    SPLIT_GROUPS.map((group) => {
      const libName = `${options.name}-${group}`;
      return [group, prefix ? `${prefix}/${libName}` : libName];
    })
  ) as Record<SplitGroup, string>;
}

function createDefinition(
  options: NormalizedOptions,
  specPath: string,
  aliases: Record<SplitGroup, string> | undefined
): ClientDefinition & { $schema: string } {
  return {
    $schema: relativeToClient(options.directory, DEFINITION_SCHEMA),
    name: options.name,
    spec: relativeToClient(options.directory, specPath),
    ...(isRemoteUrl(options.spec) && { url: options.spec }),
    generator: options.adapter,
    ...(options.generatorOptions && {
      generatorOptions: options.generatorOptions,
    }),
    ...(aliases && { split: { aliases } }),
    ...(options.scope && { tags: [`scope:${options.scope}`] }),
  };
}

function registerPlugin(tree: Tree): void {
  const nxJson = readNxJson(tree) ?? {};
  const plugins = nxJson.plugins ?? [];
  const isRegistered = plugins.some(
    (entry) =>
      (typeof entry === 'string' ? entry : entry.plugin) === CORE_PLUGIN
  );
  if (isRegistered) return;
  // Appended last so its '...' dependsOn spread merges onto other plugins' targets.
  nxJson.plugins = [...plugins, CORE_PLUGIN];
  updateNxJson(tree, nxJson);
}

function rootTsConfigPath(tree: Tree): string | undefined {
  return ['tsconfig.base.json', 'tsconfig.json'].find((path) =>
    tree.exists(path)
  );
}

function addPathAliases(
  tree: Tree,
  directory: string,
  aliases: Record<SplitGroup, string>
): void {
  const tsConfigPath = rootTsConfigPath(tree);
  if (!tsConfigPath) {
    logger.warn(log('No root tsconfig found; skipping path aliases'));
    return;
  }
  updateJson(tree, tsConfigPath, (tsConfig) => {
    const compilerOptions = (tsConfig.compilerOptions ??= {});
    const paths: Record<string, string[]> = (compilerOptions.paths ??= {});
    for (const group of SPLIT_GROUPS) {
      const entry = joinPathFragments(directory, group, 'src/index.ts');
      const existing = paths[aliases[group]];
      if (existing && !existing.includes(entry)) {
        throw new Error(
          log(
            `Path alias '${aliases[group]}' already exists in ${tsConfigPath}; pass another 'importPrefix'`
          )
        );
      }
      paths[aliases[group]] = [entry];
    }
    return tsConfig;
  });
}

function generatedDirectories(options: NormalizedOptions): string[] {
  if (!options.split) {
    return [joinPathFragments(options.directory, UNSPLIT_OUTPUT)];
  }
  return [
    joinPathFragments(options.directory, SPLIT_OUTPUT),
    ...SPLIT_GROUPS.map((group) =>
      joinPathFragments(options.directory, group, 'src')
    ),
  ];
}

export async function addClientGenerator(
  tree: Tree,
  rawOptions: AddClientGeneratorSchema
) {
  const options = normalizeOptions(rawOptions);
  const definitionPath = joinPathFragments(
    options.directory,
    CLIENT_DEFINITION_FILE
  );
  if (tree.exists(definitionPath)) {
    throw new Error(log(`${definitionPath} already exists`));
  }

  const spec = await resolveSpec(tree, options);
  const aliases = options.split ? createAliases(tree, options) : undefined;
  writeJson(
    tree,
    definitionPath,
    createDefinition(options, spec.path, aliases)
  );
  registerPlugin(tree);
  if (aliases) {
    addPathAliases(tree, options.directory, aliases);
    writeLibReadmes(tree, options);
  }

  if (options.addToGitignore) {
    for (const entry of generatedDirectories(options)) {
      addGitIgnoreEntry({ tree, entry });
      addPrettierIgnoreEntry({ tree, entry });
    }
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
  writeDownloadedSpec(tree, spec);
  logger.info(
    log(
      `✨ Added client '${options.name}'. Run 'nx run ${options.name}:generate'`
    )
  );
}

export default addClientGenerator;
