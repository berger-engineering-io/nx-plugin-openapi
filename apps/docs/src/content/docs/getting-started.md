---
title: Getting Started
description: Install and generate your first API client in under 5 minutes
---

## Install

Requires an Nx workspace (v19+) and Node.js.

```bash
# Core package
nx add @nx-plugin-openapi/core
```

Then pick a generator plugin:

```bash
# Option A: OpenAPI Generator -- 50+ languages, Angular injectable services, Java required
npm install -D @nx-plugin-openapi/plugin-openapi @openapitools/openapi-generator-cli

# Option B: hey-api -- modern TypeScript, fetch/axios, tree-shakeable, no Java
npm install -D @nx-plugin-openapi/plugin-hey-api @hey-api/openapi-ts
```

:::tip[Auto-install]
If you skip installing a plugin, the core package will attempt to install it automatically on first use.
:::

## Add a generate-api target

The quickest way:

```bash
nx g @nx-plugin-openapi/core:add-generate-api-target
```

This walks you through the options and adds a `generate-api` target to your `project.json`.

### Manual setup

Add the target yourself:

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
      "outputs": ["{options.outputPath}"]
    }
  }
}
```

Set `"generator"` to `"openapi-tools"` for OpenAPI Generator or `"hey-api"` for hey-api.

## Generate

```bash
nx run my-app:generate-api
```

The executor cleans the output directory, runs the chosen generator, and produces the client code.

## Recommended Nx setup

Add these defaults to `nx.json` so caching and build dependencies work automatically:

```json title="nx.json"
{
  "targetDefaults": {
    "generate-api": {
      "cache": true,
      "inputs": [
        "{projectRoot}/swagger.json",
        "{projectRoot}/openapi.yaml",
        "{projectRoot}/openapi-config.json"
      ],
      "outputs": ["{options.outputPath}"]
    },
    "build": {
      "dependsOn": ["generate-api"]
    }
  }
}
```

## Multiple specs

For microservice architectures, pass an object instead of a string:

```json
{
  "options": {
    "generator": "hey-api",
    "inputSpec": {
      "users-api": "apis/users.yaml",
      "products-api": "apis/products.yaml"
    },
    "outputPath": "libs/api-clients/src"
  }
}
```

Each key becomes a subdirectory under `outputPath`.

## Next steps

- [OpenAPI Generator plugin](/plugins/plugin-openapi/) -- all options for `openapi-tools`
- [hey-api plugin](/plugins/plugin-hey-api/) -- all options for `hey-api`
- [Configuration reference](/reference/configuration/) -- executor options
- [Creating custom plugins](/guides/creating-plugins/) -- build your own generator
