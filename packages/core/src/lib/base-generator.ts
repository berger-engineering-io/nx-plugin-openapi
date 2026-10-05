import { rmSync } from 'node:fs';
import { isAbsolute, join, parse, resolve } from 'node:path';
import { GeneratorContext } from './interfaces';

// Matches URL schemes like http://, https://, file:// (2+ chars to exclude Windows drive letters)
const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]+:\/\//i;

export abstract class BaseGenerator {
  protected isUrl(spec: string): boolean {
    return URL_SCHEME_PATTERN.test(spec);
  }

  protected resolveOutputPath(ctx: GeneratorContext, outputPath: string): string {
    return isAbsolute(outputPath) ? outputPath : join(ctx.root, outputPath);
  }

  protected resolveInputSpecPath(ctx: GeneratorContext, spec: string): string {
    if (this.isUrl(spec) || isAbsolute(spec)) {
      return spec;
    }
    return join(ctx.root, spec);
  }

  protected cleanOutput(ctx: GeneratorContext, relOutputPath: string) {
    // Validate input path is not empty or dangerous
    if (!relOutputPath || relOutputPath.trim() === '' || relOutputPath === '/' || relOutputPath === '.') {
      throw new Error('Cannot clean empty or root output path for safety reasons');
    }

    const full = this.resolveOutputPath(ctx, relOutputPath);
    if (this.isRootPath(ctx, full)) {
      throw new Error('Cannot clean empty or root output path for safety reasons');
    }

    rmSync(full, { recursive: true, force: true });
  }

  private isRootPath(ctx: GeneratorContext, path: string): boolean {
    const normalizedPath = resolve(path);
    return normalizedPath === resolve(ctx.root) || normalizedPath === parse(normalizedPath).root;
  }
}
