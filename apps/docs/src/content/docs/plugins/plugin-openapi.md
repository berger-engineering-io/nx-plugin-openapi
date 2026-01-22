---
title: OpenAPI Generator Plugin
description: Documentation for the @nx-plugin-openapi/plugin-openapi plugin
---

# OpenAPI Generator Plugin

The `@nx-plugin-openapi/plugin-openapi` plugin integrates [OpenAPI Generator](https://openapi-generator.tech) with the Nx Plugin OpenAPI ecosystem.

## Installation

```bash
# Install the core package and plugin
npm install --save-dev @nx-plugin-openapi/core @nx-plugin-openapi/plugin-openapi

# Install the peer dependency
npm install --save-dev @openapitools/openapi-generator-cli
```

:::tip[Auto-Installation]
The plugin and its peer dependencies can be auto-installed. If you specify `"generator": "openapi-tools"` and the plugin isn't installed, the core package will attempt to install it automatically.
:::

## Basic Usage

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "openapi-tools",
        "inputSpec": "apps/my-app/openapi.yaml",
        "outputPath": "libs/api-client/src"
      }
    }
  }
}
```

## Configuration Options

All [OpenAPI Generator CLI options](https://openapi-generator.tech/docs/usage/#generate) are supported. Pass them either directly in `options` or via the `generatorOptions` property.

### Core Options

| Option | Type | Description |
|--------|------|-------------|
| `generator` | string | Must be `"openapi-tools"` |
| `inputSpec` | string | Path to OpenAPI spec (local or URL) |
| `outputPath` | string | Output directory for generated code |
| `configFile` | string | Path to OpenAPI Generator config file |
| `skipValidateSpec` | boolean | Skip spec validation |

### Naming Options

| Option | Type | Description |
|--------|------|-------------|
| `apiNameSuffix` | string | Suffix for API class names |
| `apiPackage` | string | Package name for API classes |
| `modelNamePrefix` | string | Prefix for model class names |
| `modelNameSuffix` | string | Suffix for model class names |
| `modelPackage` | string | Package name for model classes |
| `packageName` | string | Package name for the generated library |

### Generation Behavior

| Option | Type | Description |
|--------|------|-------------|
| `dryRun` | boolean | Perform dry run without generating files |
| `minimalUpdate` | boolean | Only update changed files |
| `skipOverwrite` | boolean | Skip overwriting existing files |
| `removeOperationIdPrefix` | boolean | Remove operation ID prefixes |
| `strictSpec` | boolean | Use strict spec validation |

### Template Customization

| Option | Type | Description |
|--------|------|-------------|
| `templateDirectory` | string | Custom templates directory |
| `ignoreFileOverride` | string | Custom ignore file path |

### Global Properties

```json
{
  "globalProperties": {
    "supportsES6": "true",
    "npmName": "@my-org/api-client",
    "npmVersion": "1.0.0",
    "providedInRoot": "true",
    "withInterfaces": "true",
    "useSingleRequestParameter": "true"
  }
}
```

## Angular TypeScript Configuration

For Angular projects, use these recommended settings:

```json title="project.json"
{
  "generate-api": {
    "executor": "@nx-plugin-openapi/core:generate-api",
    "options": {
      "generator": "openapi-tools",
      "inputSpec": "apps/my-app/swagger.json",
      "outputPath": "libs/api-client/src",
      "globalProperties": {
        "supportsES6": "true",
        "providedInRoot": "true",
        "withInterfaces": "true",
        "useSingleRequestParameter": "true"
      }
    }
  }
}
```

Or use a separate config file:

```json title="openapi-config.json"
{
  "npmName": "@my-org/api-client",
  "npmVersion": "1.0.0",
  "ngVersion": "17.0.0",
  "providedInRoot": true,
  "withInterfaces": true,
  "useSingleRequestParameter": true,
  "supportsES6": true,
  "modelPropertyNaming": "camelCase",
  "enumPropertyNaming": "UPPERCASE"
}
```

```json title="project.json"
{
  "generate-api": {
    "executor": "@nx-plugin-openapi/core:generate-api",
    "options": {
      "generator": "openapi-tools",
      "inputSpec": "apps/my-app/swagger.json",
      "outputPath": "libs/api-client/src",
      "configFile": "apps/my-app/openapi-config.json"
    }
  }
}
```

## Supported Generators

OpenAPI Generator supports 50+ generators. Common ones include:

- `typescript-angular` (default for this plugin)
- `typescript-fetch`
- `typescript-axios`
- `typescript-node`
- `java`
- `kotlin`
- `python`

See the [OpenAPI Generator documentation](https://openapi-generator.tech/docs/generators/) for the full list.

## Troubleshooting

### Java Not Found

OpenAPI Generator requires Java 8+. Ensure Java is installed and available in your PATH:

```bash
java -version
```

### Spec Validation Errors

If you're confident your spec is valid, you can skip validation:

```json
{
  "skipValidateSpec": true
}
```

## Next Steps

- [Configuration Reference](/usage/configuration/) - Full configuration options
- [Examples](/usage/examples/) - Common use cases
- [Nx Integration](/usage/nx-integration/) - Advanced Nx features
