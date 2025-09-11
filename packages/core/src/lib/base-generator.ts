import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { GeneratorContext } from './interfaces';

export abstract class BaseGenerator {
  protected cleanOutput(ctx: GeneratorContext, relOutputPath: string) {
    const full = join(ctx.root, relOutputPath);
    rmSync(full, { recursive: true, force: true });
  }
}
