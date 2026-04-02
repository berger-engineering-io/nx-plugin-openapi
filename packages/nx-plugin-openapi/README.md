# @lambda-solutions/nx-plugin-openapi (Legacy)

Original Nx plugin for [OpenAPI Generator](https://openapi-generator.tech) Angular clients.

> **For new projects, use [`@nx-plugin-openapi/core`](../core/README.md) with a generator plugin instead.** It supports multiple generators and has a more flexible architecture.

## Install

```bash
nx add @lambda-solutions/nx-plugin-openapi
```

## Usage

```json
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

## Migrating to the modular packages

1. Install:
   ```bash
   npm install -D @nx-plugin-openapi/core @nx-plugin-openapi/plugin-openapi
   ```

2. Update executor in `project.json`:
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

3. Remove legacy package:
   ```bash
   npm uninstall @lambda-solutions/nx-plugin-openapi
   ```

## License

MIT
