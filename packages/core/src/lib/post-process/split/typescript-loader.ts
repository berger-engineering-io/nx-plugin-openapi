import type * as TypeScript from 'typescript';
import { SplitError } from './errors';

let typescript: typeof TypeScript | undefined;

/**
 * Loads the workspace `typescript` (optional peer dependency) on first use,
 * so core works without it unless the `split` post-processor runs.
 */
export function loadTypeScript(): typeof TypeScript {
  if (!typescript) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      typescript = require('typescript') as typeof TypeScript;
    } catch (e) {
      throw new SplitError(
        `The 'split' post-processor requires 'typescript' to be installed in the workspace`,
        e
      );
    }
  }
  return typescript;
}
