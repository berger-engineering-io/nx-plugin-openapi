import { CoreError } from '../../errors';

export class SplitError extends CoreError {}

/** A cross-lib import that violates the allowed lib dependencies. */
export interface ImportViolation {
  /** Importing file, relative to the generated output dir. */
  file: string;
  /** Import specifier as written. */
  specifier: string;
  reason: string;
}

export class SplitImportError extends SplitError {
  constructor(public violations: ImportViolation[]) {
    super(
      `Split produced ${violations.length} invalid import(s):\n${violations
        .map((v) => `  - ${v.file}: '${v.specifier}' (${v.reason})`)
        .join('\n')}`
    );
  }
}
