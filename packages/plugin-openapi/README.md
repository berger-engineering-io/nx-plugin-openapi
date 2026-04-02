# @nx-plugin-openapi/plugin-openapi

[OpenAPI Generator](https://openapi-generator.tech) plugin for `@nx-plugin-openapi/core`. Supports 50+ languages and frameworks including TypeScript Angular.

## Install

```bash
npm install -D @nx-plugin-openapi/core @nx-plugin-openapi/plugin-openapi @openapitools/openapi-generator-cli
```

## Usage

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

### With options

All [OpenAPI Generator CLI options](https://openapi-generator.tech/docs/usage/#generate) are supported:

```json
{
  "options": {
    "generator": "openapi-tools",
    "inputSpec": "apps/my-app/swagger.json",
    "outputPath": "libs/api-client/src",
    "configFile": "apps/my-app/openapi-config.json",
    "globalProperties": {
      "supportsES6": "true",
      "providedInRoot": "true",
      "withInterfaces": "true"
    }
  }
}
```

### Multiple specs

```json
{
  "options": {
    "generator": "openapi-tools",
    "inputSpec": {
      "users-api": "apis/users.yaml",
      "products-api": "apis/products.yaml"
    },
    "outputPath": "libs/api-clients/src"
  }
}
```

## Peer dependencies

- `@openapitools/openapi-generator-cli` (^2.20.2)
- Java 8+ (required by OpenAPI Generator)

## License

MIT
