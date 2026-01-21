# @nx-plugin-openapi/core

Core package for the Nx Plugin OpenAPI ecosystem. This package provides the plugin infrastructure, executor, and generators for code generation from OpenAPI specifications.

## Installation

```bash
npm install --save-dev @nx-plugin-openapi/core
```

You'll also need to install a generator plugin:

```bash
# For OpenAPI Generator
npm install --save-dev @nx-plugin-openapi/plugin-openapi @openapitools/openapi-generator-cli

# For hey-api
npm install --save-dev @nx-plugin-openapi/plugin-hey-api @hey-api/openapi-ts
```

## Features

- **Plugin Architecture**: Extensible system supporting multiple code generators
- **Auto-Installation**: Plugins are automatically installed when needed
- **Multiple Specs**: Generate code from multiple OpenAPI specifications in a single target
- **Nx Integration**: Full support for caching, affected commands, and dependency graph

## Executors

### generate-api

Generate API client code using a selected generator plugin.

```json
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "openapi-tools",
        "inputSpec": "apps/my-app/swagger.json",
        "outputPath": "libs/api-client/src"
      }
    }
  }
}
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `generator` | string | `"openapi-tools"` | Generator plugin to use (`"openapi-tools"` or `"hey-api"`) |
| `inputSpec` | string \| object | *required* | Path to OpenAPI spec(s) |
| `outputPath` | string | *required* | Output directory |
| `generatorOptions` | object | `{}` | Plugin-specific options |

## Generators

### add-generate-api-target

Add a `generate-api` target to an existing project.

```bash
nx generate @nx-plugin-openapi/core:add-generate-api-target --project=my-app
```

### init

Initialize core plugin defaults in the workspace.

```bash
nx generate @nx-plugin-openapi/core:init
```

## Available Generator Plugins

| Plugin | Package | Generator Name |
|--------|---------|----------------|
| OpenAPI Generator | `@nx-plugin-openapi/plugin-openapi` | `openapi-tools` |
| hey-api | `@nx-plugin-openapi/plugin-hey-api` | `hey-api` |

## Plugin Development

The core package exports interfaces for building custom generator plugins:

```typescript
import { GeneratorPlugin, GenerateOptionsBase, GeneratorContext } from '@nx-plugin-openapi/core';

export class MyGenerator implements GeneratorPlugin {
  readonly name = 'my-generator';

  async generate(options: GenerateOptionsBase, ctx: GeneratorContext): Promise<void> {
    // Implementation
  }
}
```

## Documentation

For comprehensive documentation, visit our [documentation site](https://berger-engineering-io.github.io/nx-plugin-openapi/).

## License

MIT
