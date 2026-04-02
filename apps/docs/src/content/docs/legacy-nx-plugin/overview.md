---
title: Legacy Plugin
description: Documentation for the original @lambda-solutions/nx-plugin-openapi package
---

:::caution[Legacy]
For new projects, use [`@nx-plugin-openapi/core`](/getting-started/) with a generator plugin instead. The legacy package only supports OpenAPI Generator and has no plugin architecture.
:::

## Install

```bash
nx add @lambda-solutions/nx-plugin-openapi
```

## Usage

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "options": {
        "inputSpec": "apps/my-app/swagger.json",
        "outputPath": "libs/api-client/src"
      }
    }
  }
}
```

```bash
nx run my-app:generate-api
```

All [OpenAPI Generator CLI options](https://openapi-generator.tech/docs/usage/#generate) are supported (`configFile`, `globalProperties`, `skipValidateSpec`, etc.).

## Migrate to modular packages

1. Install:
   ```bash
   npm install -D @nx-plugin-openapi/core @nx-plugin-openapi/plugin-openapi
   ```

2. Update executor:
   ```json
   {
     "executor": "@nx-plugin-openapi/core:generate-api",
     "options": {
       "generator": "openapi-tools",
       "inputSpec": "apps/my-app/swagger.json",
       "outputPath": "libs/api-client/src"
     }
   }
   ```

3. Uninstall legacy:
   ```bash
   npm uninstall @lambda-solutions/nx-plugin-openapi
   ```
