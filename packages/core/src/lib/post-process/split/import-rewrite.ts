import { ImportViolation } from './errors';
import {
  isRelativeSpecifier,
  resolveRelativeModule,
} from './module-resolution';
import { ALLOWED_GROUP_DEPENDENCIES, SplitGroup } from './options';
import { loadTypeScript } from './typescript-loader';

/** A module specifier string literal in a source file. */
export interface ModuleSpecifier {
  specifier: string;
  /** Offset of the first character inside the quotes. */
  start: number;
  /** Offset after the last character inside the quotes. */
  end: number;
  /** Whether this is an `export * from` re-export of the whole module. */
  isStarReExport: boolean;
}

const STAR_RE_EXPORT_PREFIX = /export\s*\*\s*from\s*$/;

/**
 * Finds all module specifiers: `import`, `import type`, `export ... from`,
 * dynamic `import()`, `import('x').T` types and `require()`. Uses the
 * TypeScript pre-processor, so specifiers in comments/strings are ignored.
 */
export function findModuleSpecifiers(source: string): ModuleSpecifier[] {
  const { importedFiles } = loadTypeScript().preProcessFile(source, true, true);
  return (
    importedFiles
      // `pos` points at the opening quote
      .map(({ fileName, pos }) => ({
        specifier: fileName,
        start: pos + 1,
        end: pos + 1 + fileName.length,
        isStarReExport: STAR_RE_EXPORT_PREFIX.test(
          source.slice(Math.max(0, pos - 40), pos)
        ),
      }))
      // skip specifiers containing escape sequences (raw text differs)
      .filter(
        ({ specifier, start, end }) => source.slice(start, end) === specifier
      )
  );
}

export interface ImportRewriteInput {
  /** Path relative to the generated output dir (POSIX). */
  path: string;
  content: string;
  group: SplitGroup;
}

export interface ImportRewriteContext {
  /** All files of the generated output (POSIX, relative), moved or not. */
  knownFiles: ReadonlySet<string>;
  /** Target group of moved files; files without group stay in place. */
  groupOf(path: string): SplitGroup | undefined;
  aliases: Record<SplitGroup, string>;
}

export interface ImportRewriteResult {
  content: string;
  violations: ImportViolation[];
  /** Same-group files imported by this file. */
  sameGroupImports: string[];
  /** Same-group files fully re-exported by this file (`export * from`). */
  sameGroupStarReExports: string[];
  /** Files of other groups imported by this file (now via alias). */
  crossGroupImports: string[];
}

type SpecifierOutcome =
  | { type: 'keep' }
  | { type: 'same-group'; target: string }
  | { type: 'cross-group'; target: string; replacement: string }
  | { type: 'violation'; reason: string };

function classifySpecifier(
  file: ImportRewriteInput,
  specifier: string,
  ctx: ImportRewriteContext
): SpecifierOutcome {
  if (!isRelativeSpecifier(specifier)) return { type: 'keep' };

  const target = resolveRelativeModule(file.path, specifier, ctx.knownFiles);
  if (!target) {
    return {
      type: 'violation',
      reason: 'cannot be resolved inside the generated output',
    };
  }
  const targetGroup = ctx.groupOf(target);
  if (!targetGroup) {
    return {
      type: 'violation',
      reason: `resolves to '${target}', which is not moved into a lib (classified 'other' or root barrel)`,
    };
  }
  if (targetGroup === file.group) return { type: 'same-group', target };
  if (!ALLOWED_GROUP_DEPENDENCIES[file.group].includes(targetGroup)) {
    return {
      type: 'violation',
      reason: `${file.group} -> ${targetGroup} is not allowed ('${target}')`,
    };
  }
  return { type: 'cross-group', target, replacement: ctx.aliases[targetGroup] };
}

/**
 * Rewrites relative imports pointing into another group to that group's alias.
 * Same-group imports stay unchanged because files keep their relative layout
 * inside their lib's `src/`. Forbidden or unresolvable imports are reported.
 */
export function rewriteImports(
  file: ImportRewriteInput,
  ctx: ImportRewriteContext
): ImportRewriteResult {
  const result: ImportRewriteResult = {
    content: file.content,
    violations: [],
    sameGroupImports: [],
    sameGroupStarReExports: [],
    crossGroupImports: [],
  };
  const specifiers = findModuleSpecifiers(file.content);
  // Replace back to front so earlier offsets stay valid
  for (const { specifier, start, end, isStarReExport } of [
    ...specifiers,
  ].reverse()) {
    const outcome = classifySpecifier(file, specifier, ctx);
    if (outcome.type === 'violation') {
      result.violations.push({
        file: file.path,
        specifier,
        reason: outcome.reason,
      });
    } else if (outcome.type === 'same-group') {
      result.sameGroupImports.push(outcome.target);
      if (isStarReExport) result.sameGroupStarReExports.push(outcome.target);
    } else if (outcome.type === 'cross-group') {
      result.crossGroupImports.push(outcome.target);
      result.content =
        result.content.slice(0, start) +
        outcome.replacement +
        result.content.slice(end);
    }
  }
  result.violations.reverse();
  return result;
}
