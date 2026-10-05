import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lists all files below `dir` as sorted POSIX paths relative to `dir`.
 * Helper for `GeneratorPlugin.classify()` implementations.
 */
export function listGeneratedFiles(dir: string, prefix = ''): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const path = prefix + entry.name;
      if (entry.isDirectory()) {
        return listGeneratedFiles(join(dir, entry.name), `${path}/`);
      }
      return entry.isFile() ? [path] : [];
    })
    .sort();
}
