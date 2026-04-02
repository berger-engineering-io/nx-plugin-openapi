# @nx-plugin-openapi/core

Core package for generating API clients from OpenAPI specs in Nx. Provides the executor, plugin loader, and generators.

## Install

```bash
nx add @nx-plugin-openapi/core
```

Then install a generator plugin:

```bash
# OpenAPI Generator (50+ languages, Angular services)
npm install -D @nx-plugin-openapi/plugin-openapi @openapitools/openapi-generator-cli

# hey-api (modern TypeScript, fetch/axios)
npm install -D @nx-plugin-openapi/plugin-hey-api @hey-api/openapi-ts
```

## Usage

Add a target via the interactive generator:

```bash
nx g @nx-plugin-openapi/core:add-generate-api-target
```

Or configure `project.json` directly:

```json
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "hey-api",
        "inputSpec": "apps/my-app/openapi.yaml",
        "outputPath": "libs/api-client/src"
      }
    }
  }
}
```

Then run:

```bash
nx run my-app:generate-api
```

## Executor options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `generator` | `string` | `"openapi-tools"` | `"openapi-tools"` or `"hey-api"` |
| `inputSpec` | `string \| object` | *required* | Path/URL to spec, or `{ name: path }` for multiple |
| `outputPath` | `string` | *required* | Output directory |
| `generatorOptions` | `object` | `{}` | Options forwarded to the generator plugin |

## Plugin development

```typescript
import { BaseGenerator, GeneratorPlugin, GenerateOptionsBase, GeneratorContext } from '@nx-plugin-openapi/core';

export class MyGenerator extends BaseGenerator implements GeneratorPlugin {
  readonly name = 'my-generator';

  async generate(options: GenerateOptionsBase, ctx: GeneratorContext): Promise<void> {
    this.cleanOutput(ctx, options.outputPath);
    // your generation logic
  }
}

export default new MyGenerator();
```

See the [Creating Custom Plugins](https://berger-engineering-io.github.io/nx-plugin-openapi/guides/creating-plugins/) guide.

## License

MIT
