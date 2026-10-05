import { join } from 'node:path';
import { logger } from '@nx/devkit';
import { classifyHeyApiOutput } from './classify';
import {
  BaseGenerator,
  GeneratorContext,
  GeneratorPlugin,
  GenerateOptionsBase,
} from '@nx-plugin-openapi/core';
import { dynamicImport } from './utils/dynamic-import';

export interface HeyApiOptions {
  [key: string]: unknown;
}

export class HeyApiGenerator
  extends BaseGenerator
  implements GeneratorPlugin<HeyApiOptions>
{
  readonly name = 'hey-api';

  async generate(
    options: HeyApiOptions & GenerateOptionsBase,
    ctx: GeneratorContext
  ): Promise<void> {
    const { inputSpec, outputPath } = options;
    const generatorOptions = (options.generatorOptions ||
      {}) as Partial<HeyApiOptions>;

    logger.info(`Starting hey-api code generation`);
    logger.debug(`Input spec: ${JSON.stringify(inputSpec)}`);
    logger.debug(`Output path: ${outputPath}`);

    if (typeof inputSpec === 'string') {
      this.cleanOutput(ctx, outputPath);
      await this.invokeOpenApiTs({
        input: this.resolveInputSpecPath(ctx, inputSpec),
        output: this.resolveOutputPath(ctx, outputPath),
        ...generatorOptions,
      });
    } else {
      const entries = Object.entries(inputSpec as Record<string, string>) as [
        string,
        string
      ][];

      logger.info(`Generating code for ${entries.length} services`);

      for (const [serviceName, specPath] of entries) {
        logger.info(`Generating service: ${serviceName}`);
        const serviceOutputPath = join(outputPath, serviceName);
        this.cleanOutput(ctx, serviceOutputPath);
        await this.invokeOpenApiTs({
          input: this.resolveInputSpecPath(ctx, specPath),
          output: this.resolveOutputPath(ctx, serviceOutputPath),
          ...generatorOptions,
        });
      }
    }

    logger.info(`hey-api code generation completed successfully`);
  }

  private async invokeOpenApiTs(
    config: { input: string; output: string } & Record<string, unknown>
  ): Promise<void> {
    let namespace: Record<string, unknown>;
    try {
      namespace = await dynamicImport('@hey-api/openapi-ts');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `@hey-api/openapi-ts is required but not installed. Install it in your workspace devDependencies. Original error: ${msg}`
      );
    }

    // ESM builds expose named exports; CJS builds loaded via import() may only
    // expose `module.exports` under `default`.
    const hasNamedApi =
      typeof namespace['generate'] === 'function' ||
      typeof namespace['createClient'] === 'function';
    const defaultExport = namespace['default'];
    const mod =
      !hasNamedApi && typeof defaultExport === 'object' && defaultExport
        ? (defaultExport as Record<string, unknown>)
        : namespace;

    const generateExport = mod['generate'];
    const createClientExport = mod['createClient'];

    const fn =
      typeof generateExport === 'function'
        ? (generateExport as (cfg: Record<string, unknown>) => Promise<unknown>)
        : typeof createClientExport === 'function'
        ? (createClientExport as (
            cfg: Record<string, unknown>
          ) => Promise<unknown>)
        : undefined;

    if (!fn) {
      const keys = Object.keys(mod).filter((k) => k !== '__esModule');
      throw new Error(
        `@hey-api/openapi-ts does not export a supported API. Expected 'generate' or 'createClient'. Available: ${keys.join(
          ', '
        )}`
      );
    }

    await fn(config as Record<string, unknown>);
  }

  classify(outDir: string) {
    return classifyHeyApiOutput(outDir);
  }
}

export default new HeyApiGenerator();
