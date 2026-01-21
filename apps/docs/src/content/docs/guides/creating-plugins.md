---
title: Creating Custom Generator Plugins
description: Learn how to create a custom plugin to integrate any OpenAPI code generator with the Nx plugin
---

# Creating Custom Generator Plugins

This guide walks you through creating a custom plugin to integrate any OpenAPI code generator with `@nx-plugin-openapi/core`. Whether you want to use a different TypeScript generator, a language-specific generator, or your own custom generator, this guide covers everything you need to know.

## Overview

The plugin architecture is designed to be extensible. Each plugin implements the `GeneratorPlugin` interface and handles the actual code generation. The core package handles:

- Plugin discovery and loading
- Configuration validation
- Nx executor integration
- Caching and task orchestration

```
┌─────────────────────────────────────────────────────────────┐
│                   @nx-plugin-openapi/core                    │
│       Executor, Plugin Loader, Auto-Installation             │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  plugin-openapi  │ │  plugin-hey-api  │ │  Your Plugin!    │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

## Quick Start

Here's a minimal plugin implementation:

```typescript
import {
  BaseGenerator,
  GeneratorContext,
  GeneratorPlugin,
  GenerateOptionsBase,
} from '@nx-plugin-openapi/core';

export class MyGenerator
  extends BaseGenerator
  implements GeneratorPlugin
{
  readonly name = 'my-generator';

  async generate(
    options: GenerateOptionsBase,
    ctx: GeneratorContext
  ): Promise<void> {
    const { inputSpec, outputPath } = options;

    // Clean the output directory
    this.cleanOutput(ctx, outputPath);

    // Call your generator here
    await this.runMyGenerator(inputSpec, outputPath, ctx);
  }

  private async runMyGenerator(
    inputSpec: string,
    outputPath: string,
    ctx: GeneratorContext
  ): Promise<void> {
    // Your generation logic here
  }
}

// Export a singleton instance
export default new MyGenerator();
```

## Core Concepts

### The GeneratorPlugin Interface

Every plugin must implement the `GeneratorPlugin` interface:

```typescript
interface GeneratorPlugin<TOptions = Record<string, unknown>> {
  // Unique identifier for the plugin
  readonly name: string;

  // Optional: Validate options before generation
  validate?(options: TOptions & GenerateOptionsBase): void | Promise<void>;

  // Required: Perform the actual code generation
  generate(
    options: TOptions & GenerateOptionsBase,
    ctx: GeneratorContext
  ): Promise<GeneratorResult | void>;

  // Optional: Return JSON schema for configuration validation
  getSchema?(): unknown;
}
```

### GenerateOptionsBase

These are the core options available to all plugins:

```typescript
interface GenerateOptionsBase {
  // Single spec path/URL or object mapping names to paths
  inputSpec: string | Record<string, string>;

  // Output directory (relative to workspace root)
  outputPath: string;

  // Plugin-specific options
  generatorOptions?: Record<string, unknown>;
}
```

### GeneratorContext

Context provided by the executor:

```typescript
interface GeneratorContext {
  // Absolute path to workspace root
  root: string;

  // Optional project name
  workspaceName?: string;
}
```

### BaseGenerator Class

The `BaseGenerator` class provides utility methods:

```typescript
abstract class BaseGenerator {
  // Safely cleans the output directory
  protected cleanOutput(ctx: GeneratorContext, relOutputPath: string): void;
}
```

## Step-by-Step Guide

### Step 1: Create the Package Structure

Create a new package in your workspace or as a standalone npm package:

```
packages/plugin-my-generator/
├── src/
│   ├── lib/
│   │   ├── my-generator.ts
│   │   ├── my-generator.spec.ts
│   │   └── options.ts
│   └── index.ts
├── package.json
├── tsconfig.json
├── tsconfig.lib.json
└── README.md
```

### Step 2: Define Your Options Interface

Create a TypeScript interface for your generator's specific options:

```typescript
// src/lib/options.ts

export interface MyGeneratorOptions {
  // Language-specific options
  language?: string;

  // Framework options
  framework?: string;

  // Output format options
  outputFormat?: 'single-file' | 'multiple-files';

  // Custom template path
  templatePath?: string;

  // Any other options your generator supports
  [key: string]: unknown;
}
```

### Step 3: Implement the Generator Class

```typescript
// src/lib/my-generator.ts

import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { logger } from '@nx/devkit';
import {
  BaseGenerator,
  GeneratorContext,
  GeneratorPlugin,
  GenerateOptionsBase,
  ExecutionError,
} from '@nx-plugin-openapi/core';
import { MyGeneratorOptions } from './options';

export class MyGenerator
  extends BaseGenerator
  implements GeneratorPlugin<MyGeneratorOptions>
{
  // Unique name used in configuration
  readonly name = 'my-generator';

  // Optional: Validate options before generation
  async validate(
    options: MyGeneratorOptions & GenerateOptionsBase
  ): Promise<void> {
    if (options.language && !['typescript', 'javascript'].includes(options.language)) {
      throw new Error(`Unsupported language: ${options.language}`);
    }
  }

  // Required: Main generation method
  async generate(
    options: MyGeneratorOptions & GenerateOptionsBase,
    ctx: GeneratorContext
  ): Promise<void> {
    const { inputSpec, outputPath } = options;
    const generatorOptions = (options.generatorOptions || {}) as Partial<MyGeneratorOptions>;

    logger.info(`Starting my-generator code generation`);

    // Handle single specification
    if (typeof inputSpec === 'string') {
      await this.generateForSpec(inputSpec, outputPath, generatorOptions, ctx);
    }
    // Handle multiple specifications
    else {
      const entries = Object.entries(inputSpec);
      logger.info(`Generating code for ${entries.length} services`);

      for (const [serviceName, specPath] of entries) {
        logger.info(`Generating service: ${serviceName}`);
        const serviceOutputPath = join(outputPath, serviceName);
        await this.generateForSpec(specPath, serviceOutputPath, generatorOptions, ctx);
      }
    }

    logger.info(`my-generator code generation completed successfully`);
  }

  private async generateForSpec(
    specPath: string,
    outputPath: string,
    options: Partial<MyGeneratorOptions>,
    ctx: GeneratorContext
  ): Promise<void> {
    // Clean the output directory before generation
    this.cleanOutput(ctx, outputPath);

    // Build the full output path
    const fullOutputPath = join(ctx.root, outputPath);

    // Call your generator
    await this.invokeGenerator(specPath, fullOutputPath, options, ctx);
  }

  private async invokeGenerator(
    specPath: string,
    outputPath: string,
    options: Partial<MyGeneratorOptions>,
    ctx: GeneratorContext
  ): Promise<void> {
    // Option 1: Call a JavaScript/TypeScript API
    await this.invokeViaApi(specPath, outputPath, options);

    // Option 2: Spawn a CLI process
    // await this.invokeViaCli(specPath, outputPath, options, ctx);
  }

  // Example: Calling a generator's JavaScript API
  private async invokeViaApi(
    specPath: string,
    outputPath: string,
    options: Partial<MyGeneratorOptions>
  ): Promise<void> {
    let generator: any;
    try {
      // Dynamic import of the generator package
      generator = await import('my-openapi-generator');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `my-openapi-generator is required but not installed. ` +
        `Install it with: npm install -D my-openapi-generator. ` +
        `Original error: ${msg}`
      );
    }

    // Call the generator's API
    await generator.generate({
      input: specPath,
      output: outputPath,
      ...options,
    });
  }

  // Example: Spawning a CLI process
  private async invokeViaCli(
    specPath: string,
    outputPath: string,
    options: Partial<MyGeneratorOptions>,
    ctx: GeneratorContext
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const args = this.buildCliArgs(specPath, outputPath, options);

      logger.debug(`Executing: npx my-generator ${args.join(' ')}`);

      const childProcess = spawn('npx', ['my-generator', ...args], {
        cwd: ctx.root,
        stdio: 'inherit',
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new ExecutionError(
            `Generator exited with code ${code}`,
            `npx my-generator ${args.join(' ')}`,
            code ?? undefined
          ));
        }
      });

      childProcess.on('error', (error) => {
        reject(new ExecutionError(
          `Failed to spawn process: ${error.message}`,
          `npx my-generator`,
          undefined,
          error
        ));
      });
    });
  }

  private buildCliArgs(
    specPath: string,
    outputPath: string,
    options: Partial<MyGeneratorOptions>
  ): string[] {
    const args: string[] = [
      '--input', specPath,
      '--output', outputPath,
    ];

    if (options.language) {
      args.push('--language', options.language);
    }

    if (options.framework) {
      args.push('--framework', options.framework);
    }

    return args;
  }
}

// Export a singleton instance - this is required!
export default new MyGenerator();
```

### Step 4: Create the Package Entry Point

```typescript
// src/index.ts

// Named exports for consumers who want to extend or test
export { MyGenerator } from './lib/my-generator';
export { MyGeneratorOptions } from './lib/options';

// Default export of the singleton instance
// This is what the plugin loader uses
export { default } from './lib/my-generator';

// Alternative named export (the loader checks multiple patterns)
export { default as MyPlugin } from './lib/my-generator';
```

### Step 5: Configure package.json

```json
{
  "name": "@my-org/plugin-my-generator",
  "version": "1.0.0",
  "description": "My custom OpenAPI generator plugin for nx-plugin-openapi",
  "type": "commonjs",
  "main": "./src/index.js",
  "typings": "./src/index.d.ts",
  "dependencies": {
    "tslib": "^2.3.0"
  },
  "peerDependencies": {
    "@nx-plugin-openapi/core": ">=0.0.1",
    "@nx/devkit": ">=19.0.0",
    "my-openapi-generator": "^1.0.0"
  },
  "peerDependenciesMeta": {
    "my-openapi-generator": {
      "optional": false
    }
  }
}
```

**Important notes:**

- Use `"type": "commonjs"` for compatibility with the plugin loader
- The underlying generator should be a **peer dependency**, not a direct dependency
- This allows users to control the version of the generator they use

### Step 6: Write Tests

```typescript
// src/lib/my-generator.spec.ts

import { MyGenerator } from './my-generator';
import { GeneratorContext } from '@nx-plugin-openapi/core';

// Mock the generator
jest.mock('my-openapi-generator', () => ({
  generate: jest.fn().mockResolvedValue(undefined),
}));

describe('MyGenerator', () => {
  let generator: MyGenerator;
  let mockContext: GeneratorContext;

  beforeEach(() => {
    generator = new MyGenerator();
    mockContext = {
      root: '/workspace',
      workspaceName: 'test-project',
    };
    jest.clearAllMocks();
  });

  it('should have the correct name', () => {
    expect(generator.name).toBe('my-generator');
  });

  it('should generate code for a single spec', async () => {
    const options = {
      inputSpec: 'api/openapi.yaml',
      outputPath: 'libs/api-client/src',
      generatorOptions: {
        language: 'typescript',
      },
    };

    await generator.generate(options, mockContext);

    const mockGenerator = await import('my-openapi-generator');
    expect(mockGenerator.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: 'api/openapi.yaml',
        output: '/workspace/libs/api-client/src',
        language: 'typescript',
      })
    );
  });

  it('should generate code for multiple specs', async () => {
    const options = {
      inputSpec: {
        'users': 'api/users.yaml',
        'products': 'api/products.yaml',
      },
      outputPath: 'libs/api-clients/src',
    };

    await generator.generate(options, mockContext);

    const mockGenerator = await import('my-openapi-generator');
    expect(mockGenerator.generate).toHaveBeenCalledTimes(2);
  });
});
```

## Using Your Plugin

Once your plugin is published or linked locally, use it in your Nx workspace:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "@my-org/plugin-my-generator",
        "inputSpec": "apps/my-app/openapi.yaml",
        "outputPath": "libs/api-client/src",
        "generatorOptions": {
          "language": "typescript",
          "framework": "fetch"
        }
      }
    }
  }
}
```

The plugin loader will:

1. Check if the plugin is registered in the `GeneratorRegistry`
2. Look in the in-memory cache
3. Try to import from `node_modules`
4. Auto-install the plugin if not found (in non-CI environments)

## Advanced Topics

### Plugin Discovery

The plugin loader looks for exports in this order:

1. `module.default` - Default export (recommended)
2. `module.createPlugin()` - Factory function
3. `module.plugin` - Named export
4. `module.Plugin` - Named export (capitalized)

### Built-in Plugin Aliases

For convenience, the core package includes aliases for built-in plugins:

| Alias | Package |
|-------|---------|
| `openapi-tools` | `@nx-plugin-openapi/plugin-openapi` |
| `hey-api` | `@nx-plugin-openapi/plugin-hey-api` |

### Registering Plugins Programmatically

For advanced use cases, you can pre-register plugins:

```typescript
import { GeneratorRegistry } from '@nx-plugin-openapi/core';
import myPlugin from '@my-org/plugin-my-generator';

const registry = GeneratorRegistry.instance();
registry.register(myPlugin);
```

### Error Handling

Use the error classes from `@nx-plugin-openapi/core` for consistent error handling:

```typescript
import {
  ExecutionError,
  ValidationError,
  ConfigurationError,
} from '@nx-plugin-openapi/core';

// For command execution failures
throw new ExecutionError(
  'Generator failed',
  'npx my-generator --input spec.yaml',
  1,  // exit code
  originalError  // optional cause
);

// For validation failures
throw new ValidationError('Invalid language option');

// For configuration issues
throw new ConfigurationError('Missing required option: framework');
```

### Implementing Retry Logic

For CLI-based generators that may have transient failures:

```typescript
private async executeWithRetry(
  fn: () => Promise<void>,
  maxAttempts: number = 3
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fn();
      return;
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Attempt ${attempt} failed: ${lastError.message}`);

      if (attempt < maxAttempts) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

### Supporting Custom Templates

If your generator supports custom templates:

```typescript
interface MyGeneratorOptions {
  templatePath?: string;
  templateVariables?: Record<string, string>;
}

private async invokeGenerator(
  specPath: string,
  outputPath: string,
  options: Partial<MyGeneratorOptions>,
  ctx: GeneratorContext
): Promise<void> {
  const templatePath = options.templatePath
    ? join(ctx.root, options.templatePath)
    : undefined;

  await generator.generate({
    input: specPath,
    output: outputPath,
    templates: templatePath,
    variables: options.templateVariables,
  });
}
```

## Real-World Examples

### Example 1: Integrating `openapi-typescript`

```typescript
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import {
  BaseGenerator,
  GeneratorPlugin,
  GenerateOptionsBase,
  GeneratorContext,
} from '@nx-plugin-openapi/core';

export class OpenApiTypescriptGenerator
  extends BaseGenerator
  implements GeneratorPlugin
{
  readonly name = 'openapi-typescript';

  async generate(
    options: GenerateOptionsBase,
    ctx: GeneratorContext
  ): Promise<void> {
    const { inputSpec, outputPath } = options;

    // Dynamic import
    const openApiTs = await import('openapi-typescript');

    if (typeof inputSpec === 'string') {
      this.cleanOutput(ctx, outputPath);
      const types = await openApiTs.default(inputSpec);
      const outFile = join(ctx.root, outputPath, 'types.ts');
      writeFileSync(outFile, types);
    } else {
      for (const [name, specPath] of Object.entries(inputSpec)) {
        const serviceOutputPath = join(outputPath, name);
        this.cleanOutput(ctx, serviceOutputPath);
        const types = await openApiTs.default(specPath);
        const outFile = join(ctx.root, serviceOutputPath, 'types.ts');
        writeFileSync(outFile, types);
      }
    }
  }
}

export default new OpenApiTypescriptGenerator();
```

### Example 2: Integrating `swagger-typescript-api`

```typescript
import { join } from 'node:path';
import {
  BaseGenerator,
  GeneratorPlugin,
  GenerateOptionsBase,
  GeneratorContext,
} from '@nx-plugin-openapi/core';

interface SwaggerTypescriptApiOptions {
  httpClientType?: 'axios' | 'fetch';
  generateClient?: boolean;
  generateRouteTypes?: boolean;
  moduleNameIndex?: number;
}

export class SwaggerTypescriptApiGenerator
  extends BaseGenerator
  implements GeneratorPlugin<SwaggerTypescriptApiOptions>
{
  readonly name = 'swagger-typescript-api';

  async generate(
    options: SwaggerTypescriptApiOptions & GenerateOptionsBase,
    ctx: GeneratorContext
  ): Promise<void> {
    const { inputSpec, outputPath, generatorOptions = {} } = options;

    const { generateApi } = await import('swagger-typescript-api');

    const config = {
      httpClientType: generatorOptions.httpClientType || 'fetch',
      generateClient: generatorOptions.generateClient ?? true,
      generateRouteTypes: generatorOptions.generateRouteTypes ?? true,
      moduleNameIndex: generatorOptions.moduleNameIndex ?? 0,
    };

    if (typeof inputSpec === 'string') {
      this.cleanOutput(ctx, outputPath);
      await generateApi({
        input: join(ctx.root, inputSpec),
        output: join(ctx.root, outputPath),
        ...config,
      });
    } else {
      for (const [name, specPath] of Object.entries(inputSpec)) {
        const serviceOutputPath = join(outputPath, name);
        this.cleanOutput(ctx, serviceOutputPath);
        await generateApi({
          input: join(ctx.root, specPath),
          output: join(ctx.root, serviceOutputPath),
          name,
          ...config,
        });
      }
    }
  }
}

export default new SwaggerTypescriptApiGenerator();
```

## Best Practices

1. **Use peer dependencies** for the underlying generator to give users version control
2. **Support both single and multiple specs** for microservice architectures
3. **Always clean the output directory** before generation to avoid stale files
4. **Use the `@nx/devkit` logger** for consistent output formatting
5. **Provide helpful error messages** when dependencies are missing
6. **Test with both local files and remote URLs** as input specs
7. **Document all available options** in your plugin's README
8. **Export a singleton instance** as the default export

## Troubleshooting

### Plugin Not Found

If your plugin isn't being loaded:

1. Ensure the package is installed: `npm ls @my-org/plugin-my-generator`
2. Check the export pattern matches what the loader expects
3. Verify `"type": "commonjs"` in package.json
4. Check for TypeScript compilation errors

### Generator Dependency Missing

If the underlying generator isn't installed:

1. Add clear instructions to install peer dependencies
2. Consider adding a helpful error message in your plugin:

```typescript
try {
  await import('my-openapi-generator');
} catch {
  throw new Error(
    'my-openapi-generator is required but not installed.\n' +
    'Install it with: npm install -D my-openapi-generator'
  );
}
```

### Path Resolution Issues

Always use `join(ctx.root, relativePath)` for absolute paths:

```typescript
// ✅ Correct
const fullPath = join(ctx.root, outputPath);

// ❌ Wrong - may resolve incorrectly
const fullPath = outputPath;
```

## Next Steps

- [Configuration Guide](/usage/configuration/) - Learn about all configuration options
- [Nx Integration](/usage/nx-integration/) - Set up caching and task dependencies
- [Examples](/usage/examples/) - See real-world configuration examples
