# @nx-plugin-openapi/plugin-hey-api

[hey-api/openapi-ts](https://heyapi.dev/) plugin for `@nx-plugin-openapi/core`. Modern TypeScript client generation with excellent type safety.

## Install

```bash
npm install -D @nx-plugin-openapi/core @nx-plugin-openapi/plugin-hey-api @hey-api/openapi-ts
```

## Usage

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

### With options

Pass hey-api options via `generatorOptions`. See [hey-api docs](https://heyapi.dev/) for all options.

```json
{
  "options": {
    "generator": "hey-api",
    "inputSpec": "apps/my-app/openapi.yaml",
    "outputPath": "libs/api-client/src",
    "generatorOptions": {
      "client": "@hey-api/client-fetch",
      "plugins": [
        "@hey-api/schemas",
        "@hey-api/services",
        { "name": "@hey-api/types", "enums": "javascript" }
      ]
    }
  }
}
```

### TanStack Query

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

### Multiple specs

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

## Peer dependencies

- `@hey-api/openapi-ts` (^0.83.1)

## License

MIT
