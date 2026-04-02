---
title: Configuration Reference
description: All executor options for the generate-api executor
---

## Core options

These apply to all generator plugins.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `generator` | `string` | `"openapi-tools"` | `"openapi-tools"` or `"hey-api"` |
| `inputSpec` | `string \| object` | *required* | Path/URL to spec, or `{ name: path }` for multiple specs |
| `outputPath` | `string` | *required* | Output directory (cleaned before each run) |
| `generatorOptions` | `object` | `{}` | Options forwarded to the selected generator plugin |

## OpenAPI Generator options (`openapi-tools`)

Pass these directly in `options` or inside `generatorOptions`. Full reference: [openapi-generator.tech/docs/usage/#generate](https://openapi-generator.tech/docs/usage/#generate)

| Option | Type | Description |
|--------|------|-------------|
| `configFile` | `string` | Path to config JSON file |
| `skipValidateSpec` | `boolean` | Skip spec validation |
| `globalProperties` | `object` | Key-value pairs passed to the generator |
| `apiNameSuffix` | `string` | Suffix for API class names |
| `modelNamePrefix` | `string` | Prefix for model class names |
| `modelNameSuffix` | `string` | Suffix for model class names |
| `packageName` | `string` | Package name for generated library |
| `templateDirectory` | `string` | Custom Mustache templates directory |
| `dryRun` | `boolean` | Preview without generating |
| `minimalUpdate` | `boolean` | Only update changed files |
| `skipOverwrite` | `boolean` | Don't overwrite existing files |
| `strictSpec` | `boolean` | Strict spec validation |
| `auth` | `string` | Auth for remote specs (e.g. `bearer:token`) |

## hey-api options (`hey-api`)

Pass these inside `generatorOptions`. Full reference: [heyapi.dev](https://heyapi.dev/)

| Option | Type | Description |
|--------|------|-------------|
| `client` | `string` | HTTP client (`"@hey-api/client-fetch"`, `"@hey-api/client-axios"`) |
| `plugins` | `array` | hey-api plugins to enable |
| `schemas` | `object` | Schema generation config |
| `services` | `object` | Service generation config |
| `types` | `object` | Type generation config |

## Environment-specific config

Use Nx configurations for different environments:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "hey-api",
        "inputSpec": "apps/my-app/openapi.yaml",
        "outputPath": "libs/api-client/src"
      },
      "configurations": {
        "dev": {
          "inputSpec": "http://localhost:3000/api/openapi.json"
        },
        "prod": {
          "inputSpec": "https://api.example.com/openapi.json"
        }
      }
    }
  }
}
```

```bash
nx run my-app:generate-api:dev
```
