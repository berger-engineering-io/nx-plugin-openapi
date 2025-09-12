import { spawn } from 'node:child_process';
import { join } from 'node:path';
import {
  BaseGenerator,
  GeneratorContext,
  GeneratorPlugin,
  GenerateOptionsBase,
  logger,
  ExecutionError,
} from '@nx-plugin-openapi/core';
import {
  buildCommandArgs,
  OpenApiGeneratorOptions,
} from './utils/build-command';

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
}

export class OpenApiToolsGenerator
  extends BaseGenerator
  implements GeneratorPlugin<OpenApiGeneratorOptions>
{
  readonly name = 'openapi-tools';
  private retryOptions: Required<RetryOptions> = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  };

  setRetryOptions(options: Partial<RetryOptions>): void {
    this.retryOptions = {
      ...this.retryOptions,
      ...options,
    };
  }

  async generate(
    options: OpenApiGeneratorOptions & GenerateOptionsBase,
    ctx: GeneratorContext
  ): Promise<void> {
    const { inputSpec, outputPath } = options;
    const generatorOptions = (options.generatorOptions ||
      {}) as Partial<OpenApiGeneratorOptions>;

    logger.info(`Starting OpenAPI code generation`);
    logger.debug(`Input spec: ${JSON.stringify(inputSpec)}`);
    logger.debug(`Output path: ${outputPath}`);

    if (typeof inputSpec === 'string') {
      this.cleanOutput(ctx, outputPath);
      const args = buildCommandArgs({
        ...generatorOptions,
        inputSpec,
        outputPath,
      });
      await this.executeWithRetry(args, ctx, inputSpec);
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
        const args = buildCommandArgs({
          ...generatorOptions,
          inputSpec: specPath,
          outputPath: serviceOutputPath,
        });
        await this.executeWithRetry(args, ctx, `${serviceName} (${specPath})`);
      }
    }
    
    logger.info(`OpenAPI code generation completed successfully`);
  }

  private async executeWithRetry(
    args: string[],
    ctx: GeneratorContext,
    specIdentifier: string
  ): Promise<void> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.retryOptions.maxAttempts; attempt++) {
      try {
        logger.debug(`Attempt ${attempt} of ${this.retryOptions.maxAttempts} for ${specIdentifier}`);
        await this.executeOpenApiGenerator(args, ctx);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Attempt ${attempt} failed for ${specIdentifier}: ${lastError.message}`);
        
        if (attempt < this.retryOptions.maxAttempts) {
          const delay = this.retryOptions.delayMs * Math.pow(this.retryOptions.backoffMultiplier, attempt - 1);
          logger.info(`Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }
    
    // All attempts failed
    logger.error(`All ${this.retryOptions.maxAttempts} attempts failed for ${specIdentifier}`);
    throw new ExecutionError(
      `Failed to generate code after ${this.retryOptions.maxAttempts} attempts`,
      'openapi-generator',
      undefined,
      lastError
    );
  }

  private async executeOpenApiGenerator(
    args: string[],
    ctx: GeneratorContext
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const command = 'node';
      const fullArgs = ['node_modules/@openapitools/openapi-generator-cli/main.js', ...args];
      
      logger.debug(`Executing: ${command} ${fullArgs.join(' ')}`);
      
      const childProcess = spawn(command, fullArgs, { 
        cwd: ctx.root, 
        stdio: 'inherit' 
      });
      
      childProcess.on('close', (code) => {
        if (code === 0) {
          logger.debug(`OpenAPI Generator completed successfully`);
          resolve();
        } else {
          const error = new ExecutionError(
            `OpenAPI Generator exited with code ${code}`,
            `${command} ${fullArgs.join(' ')}`,
            code ?? undefined
          );
          reject(error);
        }
      });
      
      childProcess.on('error', (error) => {
        logger.error(`Failed to spawn OpenAPI Generator process: ${error.message}`);
        reject(new ExecutionError(
          `Failed to spawn process: ${error.message}`,
          `${command} ${fullArgs.join(' ')}`,
          undefined,
          error
        ));
      });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new OpenApiToolsGenerator();
