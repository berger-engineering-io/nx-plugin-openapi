import { spawn } from 'node:child_process';
import { join } from 'node:path';
import {
  BaseGenerator,
  GeneratorContext,
  GeneratorPlugin,
  GenerateOptionsBase,
} from '@nx-plugin-openapi/core';
import {
  buildCommandArgs,
  OpenApiGeneratorOptions,
} from './utils/build-command';

export class OpenApiToolsGenerator
  extends BaseGenerator
  implements GeneratorPlugin<OpenApiGeneratorOptions>
{
  readonly name = 'openapi-tools';

  async generate(
    options: OpenApiGeneratorOptions & GenerateOptionsBase,
    ctx: GeneratorContext
  ): Promise<void> {
    const { inputSpec, outputPath } = options;
    const generatorOptions = (options.generatorOptions ||
      {}) as Partial<OpenApiGeneratorOptions>;

    if (typeof inputSpec === 'string') {
      this.cleanOutput(ctx, outputPath);
      const args = buildCommandArgs({
        ...generatorOptions,
        inputSpec,
        outputPath,
      });
      await this.executeOpenApiGenerator(args, ctx);
    } else {
      const entries = Object.entries(inputSpec as Record<string, string>) as [
        string,
        string
      ][];
      for (const [serviceName, specPath] of entries) {
        const serviceOutputPath = join(outputPath, serviceName);
        this.cleanOutput(ctx, serviceOutputPath);
        const args = buildCommandArgs({
          ...generatorOptions,
          inputSpec: specPath,
          outputPath: serviceOutputPath,
        });
        await this.executeOpenApiGenerator(args, ctx);
      }
    }
  }

  private async executeOpenApiGenerator(
    args: string[],
    ctx: GeneratorContext
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const childProcess = spawn(
        'node',
        ['node_modules/@openapitools/openapi-generator-cli/main.js', ...args],
        { cwd: ctx.root, stdio: 'inherit' }
      );
      childProcess.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`OpenAPI Generator exited with code ${code}`));
      });
      childProcess.on('error', (error) => reject(error));
    });
  }
}

export default new OpenApiToolsGenerator();
