---
title: hey-api Plugin
description: Use hey-api/openapi-ts with Nx via @nx-plugin-openapi/plugin-hey-api
---

The `@nx-plugin-openapi/plugin-hey-api` plugin wraps [hey-api/openapi-ts](https://heyapi.dev/) -- modern TypeScript client generation with excellent type safety, tree-shaking, and no Java dependency.

## Install

```bash
npm install -D @nx-plugin-openapi/core @nx-plugin-openapi/plugin-hey-api @hey-api/openapi-ts
```

## Basic usage

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

## Options

Pass hey-api options via `generatorOptions`. See [hey-api docs](https://heyapi.dev/) for all options.

| Option | Type | Description |
|--------|------|-------------|
| `client` | `string` | HTTP client: `"@hey-api/client-fetch"`, `"@hey-api/client-axios"` |
| `plugins` | `array` | hey-api plugins to enable |
| `schemas` | `object` | Schema generation config |
| `services` | `object` | Service generation config |
| `types` | `object` | Type generation config |

## Example with plugins

```json title="project.json"
{
  "options": {
    "generator": "hey-api",
    "inputSpec": "apps/my-app/openapi.yaml",
    "outputPath": "libs/api-client/src",
    "generatorOptions": {
      "client": "@hey-api/client-fetch",
      "plugins": [
        "@hey-api/schemas",
        { "name": "@hey-api/services", "asClass": true },
        { "name": "@hey-api/types", "enums": "javascript" }
      ]
    }
  }
}
```

## TanStack Query

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

Replace with `@tanstack/vue-query` for Vue.

## Available plugins

| Plugin | Description |
|--------|-------------|
| `@hey-api/schemas` | Generate JSON schemas |
| `@hey-api/services` | Generate service functions |
| `@hey-api/types` | Generate TypeScript types |
| `@hey-api/transformers` | Transform request/response data |
| `@tanstack/react-query` | React Query integration |
| `@tanstack/vue-query` | Vue Query integration |

## Output structure

```
libs/api-client/src/
  client/
  schemas/
  services/
  types/
  index.ts
```

## When to choose hey-api over OpenAPI Generator

| | hey-api | OpenAPI Generator |
|---|---------|-------------------|
| Languages | TypeScript only | 50+ |
| Output size | Smaller, tree-shakeable | Larger |
| Type safety | Excellent | Good |
| Angular DI | Basic | Excellent |
| Java required | No | Yes |
