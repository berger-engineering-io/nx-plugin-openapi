# Nx Plugin OpenAPI

A powerful Nx plugin ecosystem for generating API client code from OpenAPI specifications. This monorepo provides a flexible, plugin-based architecture that supports multiple code generators.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@nx-plugin-openapi/core`](./packages/core/README.md) | Core plugin system with executor and generators | [![npm](https://img.shields.io/npm/v/@nx-plugin-openapi/core.svg)](https://www.npmjs.com/package/@nx-plugin-openapi/core) |
| [`@nx-plugin-openapi/plugin-openapi`](./packages/plugin-openapi/README.md) | Plugin for [OpenAPI Generator](https://openapi-generator.tech) | [![npm](https://img.shields.io/npm/v/@nx-plugin-openapi/plugin-openapi.svg)](https://www.npmjs.com/package/@nx-plugin-openapi/plugin-openapi) |
| [`@nx-plugin-openapi/plugin-hey-api`](./packages/plugin-hey-api/README.md) | Plugin for [hey-api/openapi-ts](https://github.com/hey-api/openapi-ts) | [![npm](https://img.shields.io/npm/v/@nx-plugin-openapi/plugin-hey-api.svg)](https://www.npmjs.com/package/@nx-plugin-openapi/plugin-hey-api) |
| [`@lambda-solutions/nx-plugin-openapi`](./packages/nx-plugin-openapi/README.md) | Legacy package (OpenAPI Generator only) | [![npm](https://img.shields.io/npm/v/@lambda-solutions/nx-plugin-openapi.svg)](https://www.npmjs.com/package/@lambda-solutions/nx-plugin-openapi) |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   @nx-plugin-openapi/core                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  generate-api   │  │  Plugin Loader  │  │ Auto Install │ │
│  │   executor      │  │                 │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌────────────────────────┐           ┌────────────────────────┐
│ @nx-plugin-openapi/    │           │ @nx-plugin-openapi/    │
│   plugin-openapi       │           │   plugin-hey-api       │
│                        │           │                        │
│ Uses @openapitools/    │           │ Uses @hey-api/         │
│ openapi-generator-cli  │           │ openapi-ts             │
└────────────────────────┘           └────────────────────────┘
```

## Quick Start

### Installation

```bash
# Install the core package
nx add @nx-plugin-openapi/core

# Install a generator plugin (choose one or both)
npm install --save-dev @nx-plugin-openapi/plugin-openapi  # For OpenAPI Generator
npm install --save-dev @nx-plugin-openapi/plugin-hey-api  # For hey-api
```

### Basic Usage

Execute the following command:

```bash
nx g @nx-plugin-openapi/core:add-generate-api-target
```

This will add a `generate-api` target to your `project.json`:

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

Or use the `hey-api` generator:

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

### Run the generator

```bash
nx run my-app:generate-api
```

## Documentation

For comprehensive documentation, visit our [documentation site](https://nx-plugin-openapi.lambda-solutions.io/).

- [Getting Started](https://berger-engineering-io.github.io/nx-plugin-openapi/getting-started/overview/)
- [Installation Guide](https://berger-engineering-io.github.io/nx-plugin-openapi/getting-started/installation/)
- [Plugins Overview](https://berger-engineering-io.github.io/nx-plugin-openapi/plugins/overview/)
- [Configuration Reference](https://berger-engineering-io.github.io/nx-plugin-openapi/usage/configuration/)
- [Creating Custom Plugins](https://berger-engineering-io.github.io/nx-plugin-openapi/guides/creating-plugins/)
- [Examples](https://berger-engineering-io.github.io/nx-plugin-openapi/usage/examples/)

## Features

- **Plugin Architecture**: Choose between multiple code generators
- **Auto-Installation**: Plugins are automatically installed when needed
- **Nx Integration**: Full support for Nx caching, affected commands, and dependency graph
- **Multiple Specs**: Generate code from multiple OpenAPI specifications in a single target
- **Flexible Configuration**: Pass generator-specific options via `generatorOptions`

## Available Generators

### `openapi-tools` (via `@nx-plugin-openapi/plugin-openapi`)

Uses the battle-tested [OpenAPI Generator](https://openapi-generator.tech) to generate TypeScript Angular clients and more.

**Peer dependency**: `@openapitools/openapi-generator-cli`

### `hey-api` (via `@nx-plugin-openapi/plugin-hey-api`)

Uses [hey-api/openapi-ts](https://github.com/hey-api/openapi-ts) for modern TypeScript client generation with excellent type safety.

**Peer dependency**: `@hey-api/openapi-ts`

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT
