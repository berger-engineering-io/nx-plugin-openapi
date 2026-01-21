# @nx-plugin-openapi/plugin-hey-api

Generator plugin for [hey-api/openapi-ts](https://github.com/hey-api/openapi-ts). This plugin integrates with `@nx-plugin-openapi/core` to provide modern TypeScript client generation from OpenAPI specifications.

## Installation

```bash
npm install --save-dev @nx-plugin-openapi/core @nx-plugin-openapi/plugin-hey-api @hey-api/openapi-ts
```

## Usage

Configure the `generate-api` executor with `generator: "hey-api"`:

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

## Features

- **Modern TypeScript**: Type-safe client generation with excellent TypeScript support
- **Multiple HTTP Clients**: Support for fetch, axios, and other HTTP clients
- **Plugin System**: Extensible via hey-api plugins
- **Lightweight Output**: Cleaner, more maintainable generated code

## Options

Pass hey-api options via `generatorOptions`. See the [hey-api documentation](https://heyapi.dev/) for all available options.

| Option | Type | Description |
|--------|------|-------------|
| `client` | string | HTTP client to use (`"fetch"`, `"axios"`, etc.) |
| `plugins` | array | Array of hey-api plugins to enable |
| `schemas` | object | Schema generation configuration |
| `services` | object | Service generation configuration |
| `types` | object | Type generation configuration |

### Example with Options

```json
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "hey-api",
        "inputSpec": "apps/my-app/openapi.yaml",
        "outputPath": "libs/api-client/src",
        "generatorOptions": {
          "client": "fetch",
          "plugins": [
            "@hey-api/schemas",
            "@hey-api/services",
            "@hey-api/types"
          ]
        }
      }
    }
  }
}
```

### Using Axios Client

```json
{
  "options": {
    "generator": "hey-api",
    "inputSpec": "apps/my-app/openapi.yaml",
    "outputPath": "libs/api-client/src",
    "generatorOptions": {
      "client": "axios"
    }
  }
}
```

## Multiple Specifications

Generate clients for multiple APIs:

```json
{
  "options": {
    "generator": "hey-api",
    "inputSpec": {
      "users-api": "apis/users.yaml",
      "products-api": "apis/products.yaml"
    },
    "outputPath": "libs/api-clients/src",
    "generatorOptions": {
      "client": "fetch"
    }
  }
}
```

This generates:
```
libs/api-clients/src/
  users-api/
    // Users API client
  products-api/
    // Products API client
```

## Generated Output Structure

```
libs/api-client/src/
├── client/
│   └── client.ts
├── schemas/
│   └── ...
├── services/
│   └── ...
├── types/
│   └── ...
└── index.ts
```

## Peer Dependencies

- `@hey-api/openapi-ts` (^0.83.1)

## Documentation

- [hey-api Documentation](https://heyapi.dev/)
- [Nx Plugin OpenAPI Documentation](https://berger-engineering-io.github.io/nx-plugin-openapi/)

## License

MIT
