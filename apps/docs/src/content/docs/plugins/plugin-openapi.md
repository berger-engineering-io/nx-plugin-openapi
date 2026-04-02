---
title: OpenAPI Generator Plugin
description: Use OpenAPI Generator with Nx via @nx-plugin-openapi/plugin-openapi
---

The `@nx-plugin-openapi/plugin-openapi` plugin wraps [OpenAPI Generator](https://openapi-generator.tech) -- supporting 50+ languages and frameworks including TypeScript Angular.

## Install

```bash
npm install -D @nx-plugin-openapi/core @nx-plugin-openapi/plugin-openapi @openapitools/openapi-generator-cli
```

Requires **Java 8+** at runtime.

## Basic usage

```json title="project.json"
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

## Options

All [OpenAPI Generator CLI options](https://openapi-generator.tech/docs/usage/#generate) are supported. Pass them directly in `options` or via `generatorOptions`.

| Option | Type | Description |
|--------|------|-------------|
| `configFile` | `string` | Path to an OpenAPI Generator config JSON file |
| `skipValidateSpec` | `boolean` | Skip spec validation |
| `globalProperties` | `object` | Key-value pairs passed to the generator |
| `apiNameSuffix` | `string` | Suffix for API class names |
| `modelNamePrefix` / `modelNameSuffix` | `string` | Prefix/suffix for model names |
| `templateDirectory` | `string` | Custom Mustache templates directory |
| `dryRun` | `boolean` | Preview without generating files |

## Angular example

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "openapi-tools",
        "inputSpec": "apps/my-app/swagger.json",
        "outputPath": "libs/api-client/src",
        "globalProperties": {
          "supportsES6": "true",
          "providedInRoot": "true",
          "withInterfaces": "true"
        }
      }
    }
  }
}
```

Or use a separate config file:

```json title="openapi-config.json"
{
  "npmName": "@my-org/api-client",
  "ngVersion": "17.0.0",
  "providedInRoot": true,
  "withInterfaces": true,
  "supportsES6": true
}
```

```json title="project.json"
{
  "options": {
    "generator": "openapi-tools",
    "inputSpec": "apps/my-app/swagger.json",
    "outputPath": "libs/api-client/src",
    "configFile": "apps/my-app/openapi-config.json"
  }
}
```

## Supported generators

Default is `typescript-angular`. Other common choices:

- `typescript-fetch`, `typescript-axios`, `typescript-node`
- `java`, `kotlin`, `python`, `go`

Full list: [openapi-generator.tech/docs/generators](https://openapi-generator.tech/docs/generators/)

## Troubleshooting

**Java not found** -- OpenAPI Generator requires Java 8+. Check with `java -version`.

**Spec validation errors** -- Set `"skipValidateSpec": true` if your spec is valid but fails validation.
