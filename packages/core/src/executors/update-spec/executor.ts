import { ExecutorContext, logger, PromiseExecutor } from '@nx/devkit';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'path';
import { CoreUpdateSpecExecutorSchema, UpdateSpecFormat } from './schema';

interface SpecTarget {
  name: string;
  url: string;
  specPath: string;
}

type SpecStatus = 'unchanged' | 'updated' | 'created' | 'drift';

const KNOWN_SPEC_EXTENSIONS = ['.json', '.yaml', '.yml'];

const runExecutor: PromiseExecutor<CoreUpdateSpecExecutorSchema> = async (
  options,
  context: ExecutorContext
) => {
  try {
    const targets = resolveTargets(options, context.root);
    const headers = substituteEnvVars(options.headers ?? {});
    const format = options.format ?? 'raw';

    const statuses: SpecStatus[] = [];
    for (const target of targets) {
      const content = formatSpec(
        await fetchSpec(target.url, headers),
        format,
        target.url
      );
      const status = options.check
        ? checkSpec(target, content)
        : writeSpec(target, content);
      logStatus(target, status, context.root);
      statuses.push(status);
    }

    if (statuses.includes('drift')) {
      logger.error(
        `Remote spec differs from committed file. Run the update-spec target without 'check' and commit the result.`
      );
      return { success: false };
    }
    return { success: true };
  } catch (e) {
    logger.error(`update-spec failed: ${(e as Error).message}`);
    return { success: false };
  }
};

export function resolveTargets(
  options: CoreUpdateSpecExecutorSchema,
  root: string
): SpecTarget[] {
  const { url, urls, specPath, specPaths } = options;
  if (url && urls) {
    throw new Error(`Provide either 'url' or 'urls', not both`);
  }
  if (url) {
    if (!specPath) {
      throw new Error(`'specPath' is required when 'url' is set`);
    }
    return [{ name: 'spec', url, specPath: toAbsolute(specPath, root) }];
  }
  if (urls) {
    return Object.entries(urls).map(([name, entryUrl]) => ({
      name,
      url: entryUrl,
      specPath: toAbsolute(
        resolveMultiSpecPath(name, entryUrl, specPath, specPaths),
        root
      ),
    }));
  }
  throw new Error(`Either 'url' or 'urls' is required`);
}

function resolveMultiSpecPath(
  name: string,
  url: string,
  specDirectory: string | undefined,
  specPaths: Record<string, string> | undefined
): string {
  if (specPaths?.[name]) {
    return specPaths[name];
  }
  if (specDirectory) {
    return join(specDirectory, `${name}${specExtensionFromUrl(url)}`);
  }
  throw new Error(
    `No target for '${name}': set 'specPaths.${name}' or a 'specPath' directory`
  );
}

/** File extension taken from the URL path; falls back to '.json' */
function specExtensionFromUrl(url: string): string {
  const extension = extname(new URL(url).pathname).toLowerCase();
  return KNOWN_SPEC_EXTENSIONS.includes(extension) ? extension : '.json';
}

function toAbsolute(path: string, root: string): string {
  return isAbsolute(path) ? path : resolve(root, path);
}

/** Replaces ${ENV_VAR} placeholders so secrets can stay out of project.json */
export function substituteEnvVars(
  headers: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, envName: string) => {
        const envValue = process.env[envName];
        if (envValue === undefined) {
          throw new Error(
            `Environment variable '${envName}' used in header '${key}' is not set`
          );
        }
        return envValue;
      }),
    ])
  );
}

async function fetchSpec(
  url: string,
  headers: Record<string, string>
): Promise<string> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(
      `GET ${url} failed: ${response.status} ${response.statusText}`
    );
  }
  return response.text();
}

export function formatSpec(
  content: string,
  format: UpdateSpecFormat,
  url: string
): string {
  if (format === 'raw') {
    return content;
  }
  try {
    return `${JSON.stringify(JSON.parse(content), null, 2)}\n`;
  } catch {
    throw new Error(
      `format 'json' requires a JSON response, got non-JSON from ${url}`
    );
  }
}

function readExisting(specPath: string): string | undefined {
  return existsSync(specPath) ? readFileSync(specPath, 'utf-8') : undefined;
}

function checkSpec(target: SpecTarget, content: string): SpecStatus {
  return readExisting(target.specPath) === content ? 'unchanged' : 'drift';
}

function writeSpec(target: SpecTarget, content: string): SpecStatus {
  const existing = readExisting(target.specPath);
  if (existing === content) {
    return 'unchanged';
  }
  mkdirSync(dirname(target.specPath), { recursive: true });
  writeFileSync(target.specPath, content);
  return existing === undefined ? 'created' : 'updated';
}

function logStatus(target: SpecTarget, status: SpecStatus, root: string) {
  const path = relative(root, target.specPath);
  const messages: Record<SpecStatus, string> = {
    unchanged: `${path} is up to date`,
    updated: `${path} updated from ${target.url}`,
    created: `${path} created from ${target.url}`,
    drift: `${path} differs from ${target.url}`,
  };
  const log = status === 'drift' ? logger.error : logger.info;
  log(`[update-spec] ${messages[status]}`);
}

export default runExecutor;
