---
title: generate-api Executor
description: Complete reference for the generate-api executor
---

# generate-api Executor

The `generate-api` executor generates API client code from OpenAPI specifications using your choice of generator plugin.

## Usage

```bash
nx run <project>:generate-api
```

## Basic Configuration

```json title="project.json"
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

## Core Options

These options are available for all generator plugins.

### `generator`

- **Type:** `string`
- **Default:** `"openapi-tools"`
- **Required:** No
- **Description:** Specifies which generator plugin to use

**Available values:**
- `"openapi-tools"` - Uses OpenAPI Generator CLI (`@openapitools/openapi-generator-cli`)
- `"hey-api"` - Uses hey-api (`@hey-api/openapi-ts`)

**Examples:**
```json
{
  "generator": "openapi-tools"
}
```

```json
{
  "generator": "hey-api"
}
```

### `inputSpec`

- **Type:** `string | Record<string, string>`
- **Required:** Yes
- **Description:** Path to the OpenAPI specification file(s) or URL(s)

The input specification can be:
- A single string: Path to one OpenAPI specification (backward compatible)
- An object: Multiple specifications mapped by service name (for microservices)

#### Single Specification (String)

For projects with a single API:

```json
{
  "inputSpec": "apps/my-app/swagger.json"
}
```

```json
{
  "inputSpec": "https://api.example.com/swagger.json"
}
```

#### Multiple Specifications (Object)

For microservice architectures with multiple APIs:

```json
{
  "inputSpec": {
    "ms-product": "apps/my-app/ms-product.json",
    "ms-user": "apps/my-app/ms-user.json",
    "ms-inventory": "apps/my-app/ms-inventory.json"
  }
}
```

When using multiple specifications:
- Each key becomes a subdirectory name under `outputPath`
- Each API is generated in its own subdirectory
- All configured options are applied to each generation

**Generated structure for multiple specs:**
```
libs/api/src/
  ms-product/
    // generated API for product service
  ms-user/
    // generated API for user service
  ms-inventory/
    // generated API for inventory service
```

### `outputPath`

- **Type:** `string`
- **Required:** Yes
- **Description:** Output directory for the generated API client code

The output directory will be cleaned before generation. Relative paths are resolved from the workspace root.

**Examples:**
```json
{
  "outputPath": "libs/api-client/src"
}
```

```json
{
  "outputPath": "apps/my-app/src/app/generated"
}
```

### `generatorOptions`

- **Type:** `object`
- **Default:** `{}`
- **Required:** No
- **Description:** Plugin-specific options passed to the generator

This object allows you to pass options specific to the selected generator. The available options depend on which generator you're using.

**Example for OpenAPI Generator:**
```json
{
  "generatorOptions": {
    "configFile": "apps/my-app/openapi-config.json",
    "skipValidateSpec": true,
    "globalProperties": {
      "supportsES6": "true"
    }
  }
}
```

**Example for hey-api:**
```json
{
  "generatorOptions": {
    "client": "fetch",
    "plugins": ["@hey-api/schemas"]
  }
}
```

### `postProcess`

- **Type:** `Array<{ name: string; options?: object }>`
- **Default:** `[]`
- **Required:** No
- **Description:** Post-processors run in order after a successful generation

Each entry is resolved by `name`:

1. Post-processors registered in the `PostProcessorRegistry` (built-ins or registered programmatically)
2. Otherwise `name` is imported as a package. It must export a post-processor as `default`, `postProcessor`, or via a `createPostProcessor()` factory.

`options` is passed as-is to the post-processor. Steps run sequentially; the first failing step fails the executor and skips the remaining steps. Post-processors are skipped if the generator reports `success: false`.

**Example:**
```json
{
  "postProcess": [
    { "name": "@my-org/openapi-post-process-lint", "options": { "fix": true } },
    { "name": "@my-org/openapi-post-process-banner" }
  ]
}
```

See [Creating Plugins](/guides/creating-plugins/#post-processing) for how to write a post-processor.

#### Built-in: `split`

Splits the generated client into three libs so Nx module boundaries can be enforced on generated code: services get `type:api`, models get `type:types`.

| Lib     | Content                                          | May import      |
| ------- | ------------------------------------------------ | --------------- |
| `types` | models / DTOs (`model` files)                    | nothing         |
| `core`  | runtime: configuration, http client, utils       | `types`         |
| `api`   | services / SDK functions                         | `types`, `core` |

The generator plugin classifies its files via `classify()` (supported by `openapi-tools` and `hey-api`). Then `split`:

1. moves `model`, `api` and `core` files to `<targetRoot>/{types,api,core}/src/`, keeping their relative layout,
2. rewrites relative imports into another lib to that lib's alias (`import`, `import type`, `export ... from`, dynamic `import()`, `import('x').T`; `index` and `.js` extensions are resolved),
3. writes a `src/index.ts` barrel per lib,
4. deletes the generator's root `index.ts` barrel. Files classified `other` (README, metadata, ...) stay in place.

**Options:**

| Option       | Type                                                | Default      | Description                                                                 |
| ------------ | --------------------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| `aliases`    | `{ types: string; api: string; core: string }`      | – (required) | Import path alias per lib, e.g. `@acme/petstore-types`                       |
| `targetRoot` | `string`                                            | `outputPath` | Directory (relative to the workspace root) receiving the `types`, `api` and `core` libs |

**Example:**
```json
{
  "generator": "openapi-tools",
  "inputSpec": "libs/petstore/petstore.json",
  "outputPath": "libs/petstore/generated",
  "postProcess": [
    {
      "name": "split",
      "options": {
        "aliases": {
          "types": "@acme/petstore-types",
          "api": "@acme/petstore-api",
          "core": "@acme/petstore-core"
        }
      }
    }
  ]
}
```

Result (layout contract for tooling):

```
libs/petstore/generated/
├── types/src/index.ts   # barrel, + model files (e.g. model/pet.ts)
├── api/src/index.ts     # barrel, + service files (e.g. api/pet.service.ts)
├── core/src/index.ts    # barrel, + runtime files (e.g. configuration.ts)
└── README.md, ...       # files classified 'other'
```

`split` only owns `<lib>/src/**`: each run replaces it completely. It does **not** create `project.json` files or tsconfig path entries. The aliases must resolve to `<targetRoot>/<lib>/src/index.ts` (e.g. via `tsconfig.base.json` `paths`); the libs are meant to be set up by the `add-client` generator and inferred as Nx projects by a `createNodes` plugin.

**Notes:**

- **`targetRoot` default:** the output path itself, so the libs are regenerated together with the client and never collide with sibling directories. Since the generator cleans `outputPath` before generating, use a `targetRoot` outside of it (e.g. `libs/petstore`) if you need to keep files next to `src/` in the lib directories.
- **Boundaries:** if the classification produces a forbidden import (e.g. a model importing `core`), or an import cannot be resolved or points to a file classified `other`, `split` fails before writing anything and lists the offending imports.
- **Barrels:** re-export top-level files, entry files not imported by other files of the lib (e.g. `model/models.ts`) and files imported from other libs. If two modules export different bindings with the same name, the first one wins and the later module is re-exported by name without the clashing names.
- **Multiple specs (`inputSpec` object):** each service is split separately into `<targetRoot>/<service>/{types,api,core}`. Every alias must contain the `{service}` placeholder, e.g. `@acme/{service}-types`.
- **`classify()` options:** plugins receive the `split` options plus `generatorOptions` and, for multiple specs, `service`. `openapi-tools` classifies the `typescript-*` layouts (tuned for `typescript-angular`: `model/` → types, `api/` → api, other top-level files → core; honours `apiPackage`/`modelPackage`); unknown files are treated as `other` with a warning.
- Requires `typescript` in the workspace (optional peer dependency of `@nx-plugin-openapi/core`).

---

## OpenAPI Generator Options

The following options apply when using `generator: "openapi-tools"`. They can be specified directly in `options` or within `generatorOptions`.

### `configFile`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Path to OpenAPI Generator configuration file

Allows you to specify detailed generation options in a separate JSON file.

**Example:**
```json
{
  "configFile": "apps/my-app/openapi-config.json"
}
```

### `skipValidateSpec`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Skip validation of the OpenAPI specification

Set to `true` for faster generation when you're confident your specification is valid.

**Example:**
```json
{
  "skipValidateSpec": true
}
```

## Authentication & Security

### `auth`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Authentication configuration for accessing remote specifications

**Example:**
```json
{
  "auth": "bearer:your-api-token"
}
```

## Naming & Package Configuration

### `apiNameSuffix`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Suffix to append to generated API class names

**Example:**
```json
{
  "apiNameSuffix": "Client"
}
```

### `apiPackage`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Package name for API classes

**Example:**
```json
{
  "apiPackage": "com.example.api"
}
```

### `packageName`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Package name for the generated client library

**Example:**
```json
{
  "packageName": "@my-org/api-client"
}
```

### `modelNamePrefix`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Prefix for generated model class names

**Example:**
```json
{
  "modelNamePrefix": "Api"
}
```

### `modelNameSuffix`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Suffix for generated model class names

**Example:**
```json
{
  "modelNameSuffix": "Model"
}
```

### `modelPackage`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Package name for model classes

**Example:**
```json
{
  "modelPackage": "com.example.models"
}
```

## Project Metadata

### `artifactId`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Artifact ID for the generated code

**Example:**
```json
{
  "artifactId": "my-api-client"
}
```

### `artifactVersion`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Version of the generated artifact

**Example:**
```json
{
  "artifactVersion": "1.0.0"
}
```

### `groupId`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Group ID for the generated code

**Example:**
```json
{
  "groupId": "com.example"
}
```

## Generation Behavior

### `dryRun`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Perform a dry run without actually generating files

Useful for testing configuration without creating files.

**Example:**
```json
{
  "dryRun": true
}
```

### `enablePostProcessFile`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enable post-processing of generated files

**Example:**
```json
{
  "enablePostProcessFile": true
}
```

### `minimalUpdate`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Only update files that have actually changed

**Example:**
```json
{
  "minimalUpdate": true
}
```

### `skipOverwrite`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Skip overwriting existing files

**Example:**
```json
{
  "skipOverwrite": true
}
```

### `removeOperationIdPrefix`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Remove operation ID prefixes from generated method names

**Example:**
```json
{
  "removeOperationIdPrefix": true
}
```

### `skipOperationExample`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Skip generating operation examples in the code

**Example:**
```json
{
  "skipOperationExample": true
}
```

### `strictSpec`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Use strict specification validation

**Example:**
```json
{
  "strictSpec": true
}
```

## Templates & Customization

### `templateDirectory`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Directory containing custom templates for code generation

**Example:**
```json
{
  "templateDirectory": "apps/my-app/templates"
}
```

### `ignoreFileOverride`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Path to a custom ignore file

**Example:**
```json
{
  "ignoreFileOverride": "apps/my-app/.openapi-generator-ignore"
}
```

## Advanced Configuration

### `globalProperties`

- **Type:** `object`
- **Default:** `undefined`
- **Description:** Global properties for the OpenAPI Generator

An object where keys are property names and values are property values.

**Example:**
```json
{
  "globalProperties": {
    "supportsES6": "true",
    "npmName": "@my-org/api-client",
    "npmVersion": "1.0.0",
    "providedInRoot": "true",
    "withInterfaces": "true"
  }
}
```

### `httpUserAgent`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Custom HTTP user agent string

**Example:**
```json
{
  "httpUserAgent": "MyApp/1.0.0"
}
```

### `releaseNote`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Release notes for the generated code

**Example:**
```json
{
  "releaseNote": "Initial release of the API client"
}
```

### `inputSpecRootDirectory`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Root directory for input specifications

**Example:**
```json
{
  "inputSpecRootDirectory": "specs/"
}
```

### `invokerPackage`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Package name for invoker classes

**Example:**
```json
{
  "invokerPackage": "com.example.invoker"
}
```

## Git Integration

### `gitHost`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Git host for the repository

**Example:**
```json
{
  "gitHost": "github.com"
}
```

### `gitUserId`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Git user ID

**Example:**
```json
{
  "gitUserId": "my-username"
}
```

### `gitRepoId`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Git repository ID

**Example:**
```json
{
  "gitRepoId": "my-api-client"
}
```

## Logging & Debugging

### `logToStderr`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Log output to stderr instead of stdout

**Example:**
```json
{
  "logToStderr": true
}
```

## Complete Example

Here's a comprehensive example showing many options:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "inputSpec": "apps/demo/swagger.json",
        "outputPath": "libs/api-client/src",
        "configFile": "apps/demo/openapi-config.json",
        "packageName": "@my-org/demo-api-client",
        "apiNameSuffix": "Service",
        "modelNamePrefix": "Api",
        "modelNameSuffix": "Model",
        "skipValidateSpec": false,
        "strictSpec": true,
        "globalProperties": {
          "supportsES6": "true",
          "npmName": "@my-org/demo-api-client",
          "npmVersion": "1.0.0",
          "providedInRoot": "true",
          "withInterfaces": "true"
        }
      },
      "outputs": ["{options.outputPath}"]
    }
  }
}
```

### Multiple APIs Example

For microservice architectures:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "inputSpec": {
          "auth-service": "apis/auth-service.yaml",
          "product-service": "apis/product-service.yaml",
          "order-service": "apis/order-service.yaml",
          "payment-service": "apis/payment-service.yaml"
        },
        "outputPath": "libs/api-clients/src",
        "packageName": "@my-org/api-clients",
        "apiNameSuffix": "ApiService",
        "modelNamePrefix": "Api",
        "globalProperties": {
          "supportsES6": "true",
          "providedInRoot": "true",
          "withInterfaces": "true"
        }
      },
      "outputs": ["{options.outputPath}"]
    }
  }
}
```

This will generate:
```
libs/api-clients/src/
  auth-service/
    // Auth API client
  product-service/
    // Product API client
  order-service/
    // Order API client
  payment-service/
    // Payment API client
```

## Environment-Specific Configuration

Use configurations for different environments:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "inputSpec": "apps/demo/swagger.json",
        "outputPath": "libs/api-client/src"
      },
      "configurations": {
        "development": {
          "inputSpec": "http://localhost:3000/api/swagger.json",
          "skipValidateSpec": true
        },
        "production": {
          "inputSpec": "https://api.prod.example.com/swagger.json",
          "strictSpec": true
        }
      }
    }
  }
}
```

Run with configuration:
```bash
nx run demo:generate-api:development
```

---

## hey-api Generator Options

The following options apply when using `generator: "hey-api"`. Pass them via `generatorOptions`.

### Common hey-api Options

| Option | Type | Description |
|--------|------|-------------|
| `client` | string | HTTP client to use (`"fetch"`, `"axios"`, etc.) |
| `plugins` | array | Array of plugins to enable |
| `schemas` | object | Schema generation configuration |
| `services` | object | Service generation configuration |
| `types` | object | Type generation configuration |

For a complete list of options, see the [hey-api documentation](https://heyapi.dev/).

### hey-api Example

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "hey-api",
        "inputSpec": "apps/demo/openapi.yaml",
        "outputPath": "libs/api-client/src",
        "generatorOptions": {
          "client": "fetch",
          "plugins": [
            "@hey-api/schemas",
            "@hey-api/services",
            "@hey-api/types"
          ]
        }
      },
      "outputs": ["{options.outputPath}"]
    }
  }
}
```

### hey-api Multiple Services Example

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "hey-api",
        "inputSpec": {
          "users": "apis/users-api.yaml",
          "products": "apis/products-api.yaml"
        },
        "outputPath": "libs/api-clients/src",
        "generatorOptions": {
          "client": "axios"
        }
      },
      "outputs": ["{options.outputPath}"]
    }
  }
}
```