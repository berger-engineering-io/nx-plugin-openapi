import type * as TypeScript from 'typescript';
import { isCodeFile } from './module-resolution';
import { loadTypeScript } from './typescript-loader';

/** A named export of a module, as seen by importers. */
export interface ModuleExport {
  name: string;
  /** Identity of the exported declaration; equal keys = same binding. */
  key: string;
  /** Exports without a runtime value need `export type` under isolatedModules. */
  isTypeOnly: boolean;
}

export type ModuleExportsResolver = (path: string) => ModuleExport[];

const VIRTUAL_ROOT = '/__split__/';

function createInMemoryHost(
  ts: typeof TypeScript,
  options: TypeScript.CompilerOptions,
  files: Map<string, string>
): TypeScript.CompilerHost {
  const host = ts.createCompilerHost(options);
  return {
    ...host,
    fileExists: (fileName) => files.has(fileName),
    readFile: (fileName) => files.get(fileName),
    directoryExists: (dir) =>
      [...files.keys()].some((fileName) => fileName.startsWith(`${dir}/`)),
    getSourceFile: (fileName, languageVersion) => {
      const content = files.get(fileName);
      return content === undefined
        ? undefined
        : ts.createSourceFile(fileName, content, languageVersion, true);
    },
    writeFile: () => undefined,
  };
}

/**
 * Builds an in-memory TS program over the files of one lib and returns a
 * resolver for the named exports of each module (following `export *`).
 * Imports of other libs or packages stay unresolved, which is fine because
 * only export names and identities are needed.
 */
export function createModuleExportsResolver(
  files: { path: string; content: string }[]
): ModuleExportsResolver {
  const ts = loadTypeScript();
  const options: TypeScript.CompilerOptions = {
    noLib: true,
    allowJs: true,
    types: [],
    noEmit: true,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  };
  const virtualFiles = new Map(
    files
      .filter((file) => isCodeFile(file.path))
      .map((file) => [VIRTUAL_ROOT + file.path, file.content])
  );
  const program = ts.createProgram(
    [...virtualFiles.keys()],
    options,
    createInMemoryHost(ts, options, virtualFiles)
  );
  const checker = program.getTypeChecker();
  const keys = new Map<TypeScript.Symbol, string>();
  const keyOf = (symbol: TypeScript.Symbol, fallback: string) => {
    if (!symbol.declarations?.length) return fallback;
    if (!keys.has(symbol)) keys.set(symbol, `#${keys.size}`);
    return keys.get(symbol) as string;
  };

  return (path) => {
    const sourceFile = program.getSourceFile(VIRTUAL_ROOT + path);
    const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) return [];
    return checker
      .getExportsOfModule(moduleSymbol)
      .filter((symbol) => symbol.name !== 'default')
      .map((symbol) => {
        const target =
          symbol.flags & ts.SymbolFlags.Alias
            ? checker.getAliasedSymbol(symbol)
            : symbol;
        const resolved = !!target.declarations?.length;
        return {
          name: symbol.name,
          key: keyOf(target, `unresolved#${symbol.name}`),
          isTypeOnly: resolved && !(target.flags & ts.SymbolFlags.Value),
        };
      });
  };
}
