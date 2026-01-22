---
title: hey-api Plugin
description: Documentation for the @nx-plugin-openapi/plugin-hey-api plugin
---

# hey-api Plugin

The `@nx-plugin-openapi/plugin-hey-api` plugin integrates [hey-api/openapi-ts](https://github.com/hey-api/openapi-ts) with the Nx Plugin OpenAPI ecosystem.

## Installation

```bash
# Install the core package and plugin
npm install --save-dev @nx-plugin-openapi/core @nx-plugin-openapi/plugin-hey-api

# Install the peer dependency
npm install --save-dev @hey-api/openapi-ts
```

:::tip[Auto-Installation]
The plugin and its peer dependencies can be auto-installed. If you specify `"generator": "hey-api"` and the plugin isn't installed, the core package will attempt to install it automatically.
:::

## Basic Usage

```json title="project.json"
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

## Configuration Options

Pass hey-api specific options via the `generatorOptions` property or directly in `options`.

### Core Options

| Option | Type | Description |
|--------|------|-------------|
| `generator` | string | Must be `"hey-api"` |
| `inputSpec` | string | Path to OpenAPI spec (local or URL) |
| `outputPath` | string | Output directory for generated code |

### hey-api Options

| Option | Type | Description |
|--------|------|-------------|
| `client` | string | HTTP client to use (`"fetch"`, `"axios"`, etc.) |
| `plugins` | array | Array of hey-api plugins to enable |
| `schemas` | object | Schema generation options |
| `services` | object | Service generation options |
| `types` | object | Type generation options |

## Client Selection

hey-api supports multiple HTTP clients:

### Fetch (Default)

```json
{
  "generator": "hey-api",
  "inputSpec": "openapi.yaml",
  "outputPath": "libs/api-client/src",
  "generatorOptions": {
    "client": "@hey-api/client-fetch"
  }
}
```

### Axios

```json
{
  "generatorOptions": {
    "client": "@hey-api/client-axios"
  }
}
```

## Using Plugins

hey-api has a plugin system for customizing output:

```json
{
  "generator": "hey-api",
  "inputSpec": "openapi.yaml",
  "outputPath": "libs/api-client/src",
  "generatorOptions": {
    "client": "@hey-api/client-fetch",
    "plugins": [
      "@hey-api/schemas",
      "@hey-api/services",
      {
        "name": "@hey-api/types",
        "enums": "javascript"
      }
    ]
  }
}
```

### Available Plugins

| Plugin | Description |
|--------|-------------|
| `@hey-api/schemas` | Generate JSON schemas |
| `@hey-api/services` | Generate service functions |
| `@hey-api/types` | Generate TypeScript types |
| `@hey-api/transformers` | Transform request/response data |
| `@tanstack/react-query` | React Query integration |
| `@tanstack/vue-query` | Vue Query integration |

## TanStack Query Integration

hey-api has excellent TanStack Query support:

### React Query

```json
{
  "generatorOptions": {
    "client": "@hey-api/client-fetch",
    "plugins": [
      "@hey-api/services",
      "@hey-api/types",
      "@tanstack/react-query"
    ]
  }
}
```

### Vue Query

```json
{
  "generatorOptions": {
    "client": "@hey-api/client-fetch",
    "plugins": [
      "@hey-api/services",
      "@hey-api/types",
      "@tanstack/vue-query"
    ]
  }
}
```

## Type Generation Options

Customize how types are generated:

```json
{
  "generatorOptions": {
    "plugins": [
      {
        "name": "@hey-api/types",
        "enums": "javascript",
        "exportInlineEnums": true
      }
    ]
  }
}
```

### Enum Options

| Value | Description |
|-------|-------------|
| `"javascript"` | Generate JavaScript enums |
| `"typescript"` | Generate TypeScript enums |
| `false` | Use union types instead of enums |

## Complete Example

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "hey-api",
        "inputSpec": "apps/my-app/openapi.yaml",
        "outputPath": "libs/api-client/src/generated",
        "generatorOptions": {
          "client": "@hey-api/client-fetch",
          "plugins": [
            "@hey-api/schemas",
            {
              "name": "@hey-api/services",
              "asClass": true
            },
            {
              "name": "@hey-api/types",
              "enums": "javascript"
            }
          ]
        }
      }
    }
  }
}
```

## Why hey-api?

- **TypeScript-first**: Designed from the ground up for TypeScript
- **Tree-shakeable**: Only import what you use
- **Modern output**: ESM modules, no legacy code
- **Type safety**: Excellent type inference
- **Plugin system**: Extensible architecture
- **Active development**: Regular updates and improvements

## Comparison with OpenAPI Generator

| Feature | hey-api | OpenAPI Generator |
|---------|---------|-------------------|
| Languages | TypeScript only | 50+ languages |
| Output size | Smaller, tree-shakeable | Larger, more complete |
| Type safety | Excellent | Good |
| Angular support | Basic | Excellent (injectable services) |
| Customization | Plugins | Templates |
| Java required | No | Yes |

## Next Steps

- [hey-api Documentation](https://heyapi.dev/) - Official hey-api docs
- [Configuration Reference](/usage/configuration/) - Full configuration options
- [Examples](/usage/examples/) - Common use cases
