import {
  FileClassification,
  GeneratedFileKind,
  listGeneratedFiles,
} from '@nx-plugin-openapi/core';
import { logger } from '@nx/devkit';

const CODE_FILE_PATTERN = /\.[mc]?[tj]sx?$/;

/** Sub dirs of typescript-* generators holding support code. */
const CORE_DIRS = ['auth', 'http'];
/**
 * `types/` of the plain `typescript` generator holds API wrappers
 * (ObjectParamAPI, PromiseAPI, ...), not models.
 */
const EXTRA_API_DIRS = ['types'];

interface ClassifyOptions {
  generatorOptions?: {
    generatorName?: string;
    apiPackage?: string;
    modelPackage?: string;
  };
}

interface Layout {
  apiDirs: string[];
  modelDirs: string[];
  hasApiDir: boolean;
}

function resolveLayout(files: string[], options: ClassifyOptions): Layout {
  const { apiPackage, modelPackage } = options.generatorOptions ?? {};
  const apiDirs = [apiPackage ?? 'api', 'apis', ...EXTRA_API_DIRS];
  const modelDirs = [modelPackage ?? 'model', 'models'];
  const hasApiDir = files.some((path) => apiDirs.includes(path.split('/')[0]));
  return { apiDirs, modelDirs, hasApiDir };
}

function classifyTopLevelFile(path: string, layout: Layout): GeneratedFileKind {
  if (/^index\.[tj]s$/.test(path)) return 'other';
  // typescript-axios: `api.ts` is a barrel of `api/` or, without
  // `withSeparateModelsAndApi`, a single file holding models and apis.
  if (/^api\.[tj]s$/.test(path)) return layout.hasApiDir ? 'api' : 'other';
  // configuration, variables, encoder, api.module, param, provide-api, runtime, base, ...
  return 'core';
}

function classifyFile(path: string, layout: Layout): GeneratedFileKind {
  if (!CODE_FILE_PATTERN.test(path)) return 'other';
  const segments = path.split('/');
  if (segments.length === 1) return classifyTopLevelFile(path, layout);
  const [dir] = segments;
  if (layout.modelDirs.includes(dir)) return 'model';
  if (layout.apiDirs.includes(dir)) return 'api';
  if (CORE_DIRS.includes(dir)) return 'core';
  return 'other';
}

function warnAboutUnknownCode(
  files: Record<string, GeneratedFileKind>,
  generatorName: string
): void {
  const unknown = Object.entries(files)
    .filter(([path, kind]) => kind === 'other' && CODE_FILE_PATTERN.test(path))
    .map(([path]) => path)
    .filter((path) => !/^index\.[tj]s$/.test(path));
  if (unknown.length) {
    logger.warn(
      `openapi-tools: could not classify ${
        unknown.length
      } file(s) of generator '${generatorName}', treating them as 'other': ${unknown.join(
        ', '
      )}`
    );
  }
}

/**
 * Classifies openapi-generator output of the typescript-* generators
 * (tuned for typescript-angular): `model/**` -> model, `api/**` -> api,
 * top-level support files (configuration, variables, encoder, ...) -> core,
 * root `index.ts` and non-code files -> other.
 */
export function classifyOpenApiToolsOutput(
  outDir: string,
  options: Record<string, unknown> = {}
): FileClassification {
  const classifyOptions = options as ClassifyOptions;
  const generatorName =
    classifyOptions.generatorOptions?.generatorName ?? 'typescript-angular';
  if (!generatorName.startsWith('typescript')) {
    logger.warn(
      `openapi-tools: classification supports typescript-* generators only, got '${generatorName}'`
    );
  }
  const paths = listGeneratedFiles(outDir);
  const layout = resolveLayout(paths, classifyOptions);
  const files = Object.fromEntries(
    paths.map((path) => [path, classifyFile(path, layout)])
  );
  warnAboutUnknownCode(files, generatorName);
  return { files };
}
