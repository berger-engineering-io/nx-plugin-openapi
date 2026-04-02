# Nx Plugin OpenAPI

Generate API clients from OpenAPI specs in your Nx workspace. Pluggable architecture -- choose the generator that fits your stack.

## Packages

| Package | Description |
|---------|-------------|
| [`@nx-plugin-openapi/core`](./packages/core/README.md) | Core executor and plugin system |
| [`@nx-plugin-openapi/plugin-openapi`](./packages/plugin-openapi/README.md) | [OpenAPI Generator](https://openapi-generator.tech) -- 50+ languages, Angular services |
| [`@nx-plugin-openapi/plugin-hey-api`](./packages/plugin-hey-api/README.md) | [hey-api](https://heyapi.dev/) -- modern TypeScript, fetch/axios, tree-shakeable |

## Quick Start

**1. Install core + a generator plugin**

```bash
nx add @nx-plugin-openapi/core

# Pick one (or both):
npm install -D @nx-plugin-openapi/plugin-openapi @openapitools/openapi-generator-cli
npm install -D @nx-plugin-openapi/plugin-hey-api @hey-api/openapi-ts
```

**2. Add a target** (interactive)

```bash
nx g @nx-plugin-openapi/core:add-generate-api-target
```

Or add it manually to `project.json`:

```jsonc
// OpenAPI Generator
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

```jsonc
// hey-api
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

**3. Generate**

```bash
nx run my-app:generate-api
```

## Why this plugin?

- **Nx-native** -- caching, affected commands, dependency graph, Nx Cloud
- **Pluggable** -- swap generators without changing your workflow
- **Multiple specs** -- generate from several OpenAPI files in one target
- **Auto-install** -- missing plugins are installed on first run

## Documentation

Full docs: [berger-engineering-io.github.io/nx-plugin-openapi](https://berger-engineering-io.github.io/nx-plugin-openapi/)

## Legacy package

The original `@lambda-solutions/nx-plugin-openapi` is still maintained for backward compatibility. See [migration guide](./packages/nx-plugin-openapi/README.md).

## License

MIT
