import { join } from 'node:path';
import { logger } from '@nx/devkit';
import {
  BaseGenerator,
  GeneratorContext,
  GeneratorPlugin,
  GenerateOptionsBase,
} from '@nx-plugin-openapi/core';

export interface HeyOpenApiOptions {
  [key: string]: unknown;
}

export class HeyOpenApiGenerator
  extends BaseGenerator
  implements GeneratorPlugin<HeyOpenApiOptions>
{
  readonly name = 'hey-openapi';

  async generate(
    options: HeyOpenApiOptions & GenerateOptionsBase,
    ctx: GeneratorContext
  ): Promise<void> {
    const { inputSpec, outputPath } = options;
    const generatorOptions = (options.generatorOptions ||
      {}) as Partial<HeyOpenApiOptions>;

    logger.info(`Starting hey-openapi code generation`);
    logger.debug(`Input spec: ${JSON.stringify(inputSpec)}`);
    logger.debug(`Output path: ${outputPath}`);

    if (typeof inputSpec === 'string') {
      this.cleanOutput(ctx, outputPath);
      await this.invokeOpenApiTs({
        input: inputSpec,
        output: join(ctx.root, outputPath),
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
          input: specPath,
          output: join(ctx.root, serviceOutputPath),
          ...generatorOptions,
        });
      }
    }

    logger.info(`hey-openapi code generation completed successfully`);
  }

  private async invokeOpenApiTs(
    config: { input: string; output: string } & Record<string, unknown>
  ): Promise<void> {
    let mod: Record<string, unknown>;
    try {
      mod = (await import('@hey-api/openapi-ts')) as Record<string, unknown>;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `@hey-api/openapi-ts is required but not installed. Install it in your workspace devDependencies. Original error: ${msg}`
      );
    }

    const generateExport = (mod as Record<string, unknown>)['generate'];
    const createClientExport = (mod as Record<string, unknown>)['createClient'];

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
}

export default new HeyOpenApiGenerator();
