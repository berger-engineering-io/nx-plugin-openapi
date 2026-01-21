# @nx-plugin-openapi/plugin-openapi

Generator plugin for [OpenAPI Generator](https://openapi-generator.tech). This plugin integrates with `@nx-plugin-openapi/core` to provide code generation capabilities using the OpenAPI Generator CLI.

## Installation

```bash
npm install --save-dev @nx-plugin-openapi/core @nx-plugin-openapi/plugin-openapi @openapitools/openapi-generator-cli
```

## Usage

Configure the `generate-api` executor with `generator: "openapi-tools"`:

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

## Features

- **TypeScript Angular Generation**: Generate Angular services and models
- **Multiple Languages**: Support for 50+ languages via OpenAPI Generator
- **Custom Templates**: Use custom Mustache templates
- **Configuration Files**: External configuration via JSON files
- **Retry Mechanism**: Automatic retry on transient failures

## Options

All [OpenAPI Generator CLI options](https://openapi-generator.tech/docs/usage/#generate) are supported. Common options include:

| Option | Type | Description |
|--------|------|-------------|
| `configFile` | string | Path to configuration file |
| `skipValidateSpec` | boolean | Skip spec validation |
| `globalProperties` | object | Global generator properties |
| `apiNameSuffix` | string | Suffix for API class names |
| `modelNamePrefix` | string | Prefix for model class names |
| `modelNameSuffix` | string | Suffix for model class names |

### Example with Options

```json
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "openapi-tools",
        "inputSpec": "apps/my-app/swagger.json",
        "outputPath": "libs/api-client/src",
        "configFile": "apps/my-app/openapi-config.json",
        "globalProperties": {
          "supportsES6": "true",
          "npmName": "@my-org/api-client",
          "providedInRoot": "true",
          "withInterfaces": "true"
        }
      }
    }
  }
}
```

### Configuration File Example

```json title="openapi-config.json"
{
  "npmName": "@my-org/api-client",
  "npmVersion": "1.0.0",
  "ngVersion": "17.0.0",
  "providedInRoot": true,
  "withInterfaces": true,
  "useSingleRequestParameter": true,
  "supportsES6": true
}
```

## Multiple Specifications

Generate clients for multiple APIs:

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

## Peer Dependencies

- `@openapitools/openapi-generator-cli` (^2.20.2)

## Documentation

- [OpenAPI Generator Documentation](https://openapi-generator.tech/docs/generators/typescript-angular)
- [Nx Plugin OpenAPI Documentation](https://berger-engineering-io.github.io/nx-plugin-openapi/)

## License

MIT
