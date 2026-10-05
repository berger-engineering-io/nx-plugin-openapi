import { posix } from 'node:path';

const CODE_FILE_PATTERN = /\.(d\.)?[mc]?[tj]sx?$/;

/** Whether a file is TS/JS source whose imports must be rewritten. */
export function isCodeFile(path: string): boolean {
  return CODE_FILE_PATTERN.test(path);
}

/** Root `index.*` barrel of the generated output; replaced by generated barrels. */
export function isRootBarrel(path: string): boolean {
  return /^index\.[mc]?[tj]sx?$/.test(path);
}

/** Strips the TS/JS extension for use in an import specifier (`a.d.ts` -> `a`). */
export function toModuleSpecifierPath(path: string): string {
  return path
    .replace(/\.d\.([mc]?)ts$/, '.$1ts')
    .replace(/\.(m|c)ts$/, '.$1js')
    .replace(/\.[tj]sx?$/, '');
}

const SOURCE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.d.ts',
  '.js',
  '.jsx',
  '.mts',
  '.d.mts',
  '.mjs',
  '.cts',
  '.d.cts',
  '.cjs',
];

/** TS source candidates for an emitted JS extension (`./a.js` -> `./a.ts`). */
const TS_EXTENSIONS_BY_JS_EXTENSION: Record<string, string[]> = {
  '.js': ['.ts', '.tsx', '.d.ts'],
  '.jsx': ['.tsx'],
  '.mjs': ['.mts', '.d.mts'],
  '.cjs': ['.cts', '.d.cts'],
};

function candidatePaths(basePath: string): string[] {
  const jsExtension = posix.extname(basePath);
  const tsReplacements = (TS_EXTENSIONS_BY_JS_EXTENSION[jsExtension] ?? []).map(
    (extension) => basePath.slice(0, -jsExtension.length) + extension
  );
  const indexPrefix = basePath === '.' ? '' : `${basePath}/`;
  return [
    basePath,
    ...tsReplacements,
    ...SOURCE_EXTENSIONS.map((extension) => basePath + extension),
    ...SOURCE_EXTENSIONS.map((extension) => `${indexPrefix}index${extension}`),
  ];
}

/**
 * Resolves a relative module specifier the way TS (node/bundler resolution)
 * does, against a set of known files. Paths are POSIX, relative to the
 * generated output dir. Returns `undefined` if nothing matches or the
 * specifier leaves the output dir.
 */
export function resolveRelativeModule(
  importerPath: string,
  specifier: string,
  knownFiles: ReadonlySet<string>
): string | undefined {
  const basePath = posix.normalize(
    posix.join(posix.dirname(importerPath), specifier)
  );
  const normalizedBase = basePath.replace(/\/$/, '');
  if (normalizedBase === '..' || normalizedBase.startsWith('../')) {
    return undefined;
  }
  return candidatePaths(normalizedBase).find((candidate) =>
    knownFiles.has(candidate)
  );
}

/** Whether a specifier is relative (`./x`, `../x`, `.`, `..`). */
export function isRelativeSpecifier(specifier: string): boolean {
  return specifier === '.' || specifier === '..' || /^\.\.?\//.test(specifier);
}
