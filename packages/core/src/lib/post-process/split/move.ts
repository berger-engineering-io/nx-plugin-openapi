import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { SplitError } from './errors';
import { SPLIT_GROUPS, SplitGroup } from './options';

/** Source dir of a lib: `<targetDir>/<group>/src`. */
export function libSourceDir(targetDir: string, group: SplitGroup): string {
  return join(targetDir, group, 'src');
}

export function readGeneratedFile(sourceDir: string, path: string): Buffer {
  const absolutePath = join(sourceDir, path);
  if (!existsSync(absolutePath)) {
    throw new SplitError(`Classified file does not exist: ${absolutePath}`);
  }
  return readFileSync(absolutePath);
}

/** Removes empty parent dirs of `path`, stopping at `stopDir`. */
function pruneEmptyDirs(path: string, stopDir: string): void {
  let dir = dirname(path);
  while (dir.startsWith(stopDir) && dir !== stopDir) {
    if (!existsSync(dir) || readdirSync(dir).length) return;
    rmdirSync(dir);
    dir = dirname(dir);
  }
}

/** Deletes moved/dropped files from the generated output, pruning empty dirs. */
export function removeGeneratedFiles(sourceDir: string, paths: string[]): void {
  for (const path of paths) {
    const absolutePath = join(sourceDir, path);
    rmSync(absolutePath, { force: true });
    pruneEmptyDirs(absolutePath, sourceDir);
  }
}

/**
 * Clears the `src` dir of every lib so files removed from the spec do not
 * linger. Everything else in the lib dir (project.json, tsconfig, ...) is kept.
 */
export function resetLibSources(targetDir: string): void {
  for (const group of SPLIT_GROUPS) {
    rmSync(libSourceDir(targetDir, group), { recursive: true, force: true });
  }
}

export function writeLibFile(
  targetDir: string,
  group: SplitGroup,
  path: string,
  content: string | Buffer
): void {
  const absolutePath = join(libSourceDir(targetDir, group), path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
}
