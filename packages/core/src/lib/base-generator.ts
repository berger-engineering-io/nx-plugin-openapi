import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { GeneratorContext } from './interfaces';

export abstract class BaseGenerator {
  protected cleanOutput(ctx: GeneratorContext, relOutputPath: string) {
    // Validate input path is not empty or dangerous
    if (!relOutputPath || relOutputPath.trim() === '' || relOutputPath === '/' || relOutputPath === '.') {
      throw new Error('Cannot clean empty or root output path for safety reasons');
    }

    const full = join(ctx.root, relOutputPath);
    rmSync(full, { recursive: true, force: true });
  }
}
