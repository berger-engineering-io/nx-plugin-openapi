import { logger } from '@nx/devkit';
import { relative } from 'node:path';
import {
  GeneratedFileKind,
  PostProcessContext,
  PostProcessor,
} from '../../interfaces';
import {
  BARREL_PATH,
  BarrelInput,
  renderBarrel,
  selectBarrelModules,
} from './barrels';
import { classifyUnit } from './classify';
import { SplitError, SplitImportError } from './errors';
import { ImportRewriteContext, rewriteImports } from './import-rewrite';
import { createModuleExportsResolver } from './module-exports';
import { isCodeFile, isRootBarrel } from './module-resolution';
import {
  GROUP_BY_KIND,
  resolveSplitUnits,
  SPLIT_GROUPS,
  SplitGroup,
  SplitOptions,
  SplitUnit,
} from './options';
import {
  readGeneratedFile,
  removeGeneratedFiles,
  resetLibSources,
  writeLibFile,
} from './move';

interface PlannedFile {
  path: string;
  group: SplitGroup;
  content: string | Buffer;
}

interface SplitPlan {
  files: PlannedFile[];
  barrels: Record<SplitGroup, string>;
  /** Generated files to delete (moved files and dropped root barrels). */
  removedPaths: string[];
}

function groupOfFile(
  files: Record<string, GeneratedFileKind>,
  path: string
): SplitGroup | undefined {
  return isRootBarrel(path) ? undefined : GROUP_BY_KIND[files[path]];
}

function readPlannedFiles(
  unit: SplitUnit,
  files: Record<string, GeneratedFileKind>
): PlannedFile[] {
  return Object.keys(files)
    .sort()
    .flatMap((path) => {
      const group = groupOfFile(files, path);
      if (!group) return [];
      const raw = readGeneratedFile(unit.sourceDir, path);
      return [
        { path, group, content: isCodeFile(path) ? raw.toString('utf8') : raw },
      ];
    });
}

function warnAboutUnmovedCode(files: Record<string, GeneratedFileKind>): void {
  const unmoved = Object.keys(files).filter(
    (path) =>
      !isRootBarrel(path) && !groupOfFile(files, path) && isCodeFile(path)
  );
  if (unmoved.length) {
    logger.warn(
      `split: ${
        unmoved.length
      } code file(s) classified 'other' stay in place: ${unmoved.join(', ')}`
    );
  }
}

type ImportGraph = Omit<BarrelInput, 'files'>;

/**
 * Rewrites imports of all planned code files in place and returns the
 * import graph needed for the barrels. Throws on any violation.
 */
function rewritePlannedImports(
  plannedFiles: PlannedFile[],
  ctx: ImportRewriteContext
): ImportGraph {
  const importedWithinGroup = new Set<string>();
  const importedFromOtherGroups = new Set<string>();
  const starReExports = new Map<string, string[]>();
  const violations = plannedFiles
    .filter((file) => typeof file.content === 'string' && isCodeFile(file.path))
    .flatMap((file) => {
      const result = rewriteImports(
        { path: file.path, group: file.group, content: file.content as string },
        ctx
      );
      file.content = result.content;
      result.sameGroupImports.forEach((path) => importedWithinGroup.add(path));
      result.crossGroupImports.forEach((path) =>
        importedFromOtherGroups.add(path)
      );
      starReExports.set(file.path, result.sameGroupStarReExports);
      return result.violations;
    });
  if (violations.length) throw new SplitImportError(violations);
  return { importedWithinGroup, importedFromOtherGroups, starReExports };
}

function renderBarrels(
  plannedFiles: PlannedFile[],
  importGraph: ImportGraph
): Record<SplitGroup, string> {
  return Object.fromEntries(
    SPLIT_GROUPS.map((group) => {
      const groupFiles = plannedFiles.filter((file) => file.group === group);
      const modules = selectBarrelModules({
        files: groupFiles.map((file) => file.path),
        ...importGraph,
      });
      const barrel = renderBarrel(
        modules,
        createModuleExportsResolver(
          groupFiles.flatMap(({ path, content }) =>
            typeof content === 'string' ? [{ path, content }] : []
          )
        )
      );
      if (barrel.shadowedExports.length) {
        logger.info(
          `split: ${group} barrel omits exports clashing with earlier modules: ${barrel.shadowedExports.join(
            ', '
          )}`
        );
      }
      return [group, barrel.content];
    })
  ) as Record<SplitGroup, string>;
}

/**
 * Computes the split in memory: rewritten file contents and barrels.
 * Throws {@link SplitImportError} before anything is written if an import
 * crosses lib boundaries in a forbidden way.
 */
function planSplit(
  unit: SplitUnit,
  files: Record<string, GeneratedFileKind>
): SplitPlan {
  const plannedFiles = readPlannedFiles(unit, files);
  if (!plannedFiles.length) {
    throw new SplitError(`No files to split in ${unit.sourceDir}`);
  }
  const importGraph = rewritePlannedImports(plannedFiles, {
    knownFiles: new Set(Object.keys(files)),
    groupOf: (path: string) => groupOfFile(files, path),
    aliases: unit.aliases,
  });
  return {
    files: plannedFiles,
    barrels: renderBarrels(plannedFiles, importGraph),
    removedPaths: [
      ...plannedFiles.map((file) => file.path),
      ...Object.keys(files).filter(isRootBarrel),
    ],
  };
}

function applySplit(unit: SplitUnit, plan: SplitPlan): void {
  removeGeneratedFiles(unit.sourceDir, plan.removedPaths);
  resetLibSources(unit.targetDir);
  plan.files.forEach((file) =>
    writeLibFile(unit.targetDir, file.group, file.path, file.content)
  );
  SPLIT_GROUPS.forEach((group) =>
    writeLibFile(unit.targetDir, group, BARREL_PATH, plan.barrels[group])
  );
}

async function splitUnit(
  ctx: PostProcessContext,
  unit: SplitUnit,
  options: Partial<SplitOptions>
): Promise<void> {
  const files = await classifyUnit(ctx, unit, options);
  warnAboutUnmovedCode(files);
  const plan = planSplit(unit, files);
  applySplit(unit, plan);
  logger.info(
    `split: moved ${plan.files.length} file(s) into ${
      relative(ctx.root, unit.targetDir) || '.'
    }/{${SPLIT_GROUPS.join(',')}}`
  );
}

/**
 * Built-in `split` post-processor: moves generated files into separate
 * `types`, `api` and `core` libs below `targetRoot`, rewrites cross-lib
 * relative imports to the configured aliases and generates `src/index.ts`
 * barrels. Requires the generator plugin to implement `classify()`.
 */
export const splitPostProcessor: PostProcessor<Partial<SplitOptions>> = {
  name: 'split',
  async run(ctx, options) {
    const units = resolveSplitUnits(ctx, options);
    for (const unit of units) {
      await splitUnit(ctx, unit, options);
    }
  },
};
