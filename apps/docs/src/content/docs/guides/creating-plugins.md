---
title: Creating Custom Plugins
description: Build a custom generator plugin for @nx-plugin-openapi/core
---

Each plugin implements the `GeneratorPlugin` interface and handles the actual code generation. The core package handles plugin discovery, Nx integration, and caching.

## Minimal plugin

```typescript
import {
  BaseGenerator,
  GeneratorPlugin,
  GenerateOptionsBase,
  GeneratorContext,
} from '@nx-plugin-openapi/core';

export class MyGenerator extends BaseGenerator implements GeneratorPlugin {
  readonly name = 'my-generator';

  async generate(options: GenerateOptionsBase, ctx: GeneratorContext): Promise<void> {
    const { inputSpec, outputPath } = options;

    if (typeof inputSpec === 'string') {
      this.cleanOutput(ctx, outputPath);
      await this.run(inputSpec, outputPath, options.generatorOptions || {}, ctx);
    } else {
      for (const [name, specPath] of Object.entries(inputSpec)) {
        const out = `${outputPath}/${name}`;
        this.cleanOutput(ctx, out);
        await this.run(specPath, out, options.generatorOptions || {}, ctx);
      }
    }
  }

  private async run(spec: string, out: string, opts: Record<string, unknown>, ctx: GeneratorContext) {
    const { join } = await import('node:path');
    const generator = await import('my-openapi-generator');
    await generator.generate({ input: spec, output: join(ctx.root, out), ...opts });
  }
}

export default new MyGenerator();
```

## Plugin interface

```typescript
interface GeneratorPlugin<TOptions = Record<string, unknown>> {
  readonly name: string;
  validate?(options: TOptions & GenerateOptionsBase): void | Promise<void>;
  generate(options: TOptions & GenerateOptionsBase, ctx: GeneratorContext): Promise<void>;
  getSchema?(): unknown;
}

interface GenerateOptionsBase {
  inputSpec: string | Record<string, string>;
  outputPath: string;
  generatorOptions?: Record<string, unknown>;
}

interface GeneratorContext {
  root: string;
  workspaceName?: string;
}
```

`BaseGenerator` provides `cleanOutput(ctx, relPath)` to safely remove the output directory before generation.

## Package setup

```
my-plugin/
  src/
    lib/my-generator.ts
    index.ts
  package.json
```

```typescript title="src/index.ts"
export { MyGenerator } from './lib/my-generator';
export { default } from './lib/my-generator';
```

```json title="package.json"
{
  "name": "@my-org/plugin-my-generator",
  "type": "commonjs",
  "main": "./src/index.js",
  "peerDependencies": {
    "@nx-plugin-openapi/core": ">=0.0.1",
    "my-openapi-generator": "^1.0.0"
  }
}
```

Key points:
- Use `"type": "commonjs"` for plugin loader compatibility
- The underlying generator should be a **peer dependency**
- Export a **default singleton** instance

## Using your plugin

```json title="project.json"
{
  "options": {
    "generator": "@my-org/plugin-my-generator",
    "inputSpec": "apps/my-app/openapi.yaml",
    "outputPath": "libs/api-client/src",
    "generatorOptions": { "language": "typescript" }
  }
}
```

The plugin loader tries these export patterns in order:
1. `module.default` (recommended)
2. `module.createPlugin()`
3. `module.plugin`
4. `module.Plugin`

## Error handling

Use the built-in error classes for consistent reporting:

```typescript
import { ExecutionError, ValidationError, ConfigurationError } from '@nx-plugin-openapi/core';

throw new ExecutionError('Generator failed', 'npx my-gen --input spec.yaml', 1);
throw new ValidationError('Invalid language');
throw new ConfigurationError('Missing option: framework');
```

## Best practices

1. Support both single and multiple specs (`string | Record<string, string>`)
2. Always clean output before generation
3. Use `@nx/devkit` logger for output
4. Provide clear error messages when peer dependencies are missing
5. Test with both local files and remote URLs
