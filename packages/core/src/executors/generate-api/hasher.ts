import {
  CustomHasher,
  Hash,
  hashArray,
  HasherContext,
  logger,
  Task,
  workspaceRoot,
} from '@nx/devkit';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { isAbsolute, resolve } from 'path';
import { log } from '../../generators/utils/log';
import { InputSpec } from '../../lib/interfaces';
import { isValidInputSpec } from '../../lib/type-guards';

const MISSING_FILE_MARKER = '<missing>';

/**
 * Extends the default Nx task hash with the content of the OpenAPI spec(s),
 * so changes to local or remote specs invalidate the cache.
 * `generator` and `generatorOptions` are already part of the task hash (options).
 */
export const generateApiHasher: CustomHasher = async (task, context) => {
  const taskHash = await context.hasher.hashTask(
    task,
    context.taskGraph,
    process.env
  );
  const inputSpec = resolveInputSpec(task, context);
  const specHashes = await hashSpecs(inputSpec);

  const hash: Hash = {
    value: hashArray([taskHash.value, ...specHashes]),
    details: taskHash.details,
  };
  return hash;
};

export default generateApiHasher;

function resolveInputSpec(task: Task, context: HasherContext): InputSpec {
  const { project, target, configuration } = task.target;
  const targetConfig =
    context.projectsConfigurations.projects[project]?.targets?.[target];
  const options = {
    ...targetConfig?.options,
    ...(configuration ? targetConfig?.configurations?.[configuration] : {}),
    ...task.overrides,
  };

  if (!isValidInputSpec(options.inputSpec)) {
    throw new Error(
      log(`Invalid or missing 'inputSpec' for task ${task.id}`)
    );
  }
  return options.inputSpec;
}

async function hashSpecs(inputSpec: InputSpec): Promise<string[]> {
  const specs: Array<[string, string]> =
    typeof inputSpec === 'string'
      ? [['', inputSpec]]
      : Object.entries(inputSpec);

  const hashes: string[] = [];
  for (const [serviceName, specLocation] of specs) {
    hashes.push(serviceName, specLocation, await hashSpec(specLocation));
  }
  return hashes;
}

async function hashSpec(specLocation: string): Promise<string> {
  const content = isRemoteUrl(specLocation)
    ? await fetchRemoteSpec(specLocation)
    : readLocalSpec(specLocation);
  return content === undefined ? MISSING_FILE_MARKER : sha256(content);
}

function isRemoteUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchRemoteSpec(url: string): Promise<string> {
  logger.verbose(log(`Fetching remote OpenAPI spec for hashing: ${url}`));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      log(
        `Failed to fetch remote OpenAPI spec '${url}' for hashing: ${response.status} ${response.statusText}`
      )
    );
  }
  return response.text();
}

/** Returns undefined for missing files; the executor reports the real error. */
function readLocalSpec(specPath: string): string | undefined {
  const absolutePath = isAbsolute(specPath)
    ? specPath
    : resolve(workspaceRoot, specPath);
  if (!existsSync(absolutePath)) {
    logger.verbose(log(`OpenAPI spec not found for hashing: ${absolutePath}`));
    return undefined;
  }
  return readFileSync(absolutePath, 'utf8');
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}
