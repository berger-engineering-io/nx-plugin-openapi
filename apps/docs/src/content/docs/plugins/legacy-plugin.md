---
title: "@lambda-solutions/nx-plugin-openapi"
description: Documentation for the original standalone Nx plugin for OpenAPI Generator
---

# @lambda-solutions/nx-plugin-openapi

The original Nx Plugin for seamless integration of [OpenAPI Generator](https://openapi-generator.tech) in your Nx workspace.

:::note[Legacy Package]
This is the original standalone plugin. For new projects, consider using the modular [`@nx-plugin-openapi/core`](/getting-started/installation/) package which provides more flexibility with multiple generator plugins.
:::

## Features

- Executor for generating API clients from OpenAPI specifications
- First-class Nx caching support
- TypeScript Angular client generation
- Works with both local and remote OpenAPI specs

## Installation

### Using nx add (Recommended)

The easiest way to install the plugin:

```bash
nx add @lambda-solutions/nx-plugin-openapi
```

This command will:
- Install the plugin package
- Install the required peer dependency (`@openapitools/openapi-generator-cli`)

### Manual Installation

If you prefer manual installation:

```bash
# Install the plugin
npm install --save-dev @lambda-solutions/nx-plugin-openapi

# Install the peer dependency
npm install --save-dev @openapitools/openapi-generator-cli
```

## Quick Start

### 1. Add a generate-api target

Add a `generate-api` target to your `project.json`:

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

### 2. Run the generator

```bash
nx run my-app:generate-api
```

## Configuration

### Required Options

| Option | Type | Description |
|--------|------|-------------|
| `inputSpec` | string | Path to the OpenAPI specification file (local file or URL) |
| `outputPath` | string | Output directory for the generated client |

### Core Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `configFile` | string | - | Path to OpenAPI Generator configuration file |
| `skipValidateSpec` | boolean | `false` | Skip validation of the OpenAPI specification |
| `auth` | string | - | Authentication for remote specs (e.g., `bearer:token`) |

### Naming Options

| Option | Type | Description |
|--------|------|-------------|
| `apiNameSuffix` | string | Suffix to append to API class names |
| `apiPackage` | string | Package name for API classes |
| `packageName` | string | Package name for the generated library |
| `modelNamePrefix` | string | Prefix for model class names |
| `modelNameSuffix` | string | Suffix for model class names |
| `modelPackage` | string | Package name for model classes |

### Project Information

| Option | Type | Description |
|--------|------|-------------|
| `artifactId` | string | Artifact ID for the generated project |
| `artifactVersion` | string | Artifact version |
| `groupId` | string | Group ID for Maven-style organization |

### Generation Behavior

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dryRun` | boolean | `false` | Perform dry run without generating files |
| `enablePostProcessFile` | boolean | `false` | Enable post-processing of files |
| `minimalUpdate` | boolean | `false` | Only update changed files |
| `skipOverwrite` | boolean | `false` | Don't overwrite existing files |
| `removeOperationIdPrefix` | boolean | `false` | Remove operation ID prefixes |
| `skipOperationExample` | boolean | `false` | Skip operation examples |
| `strictSpec` | boolean | `false` | Use strict spec validation |

### Template Customization

| Option | Type | Description |
|--------|------|-------------|
| `templateDirectory` | string | Custom templates directory |
| `ignoreFileOverride` | string | Custom ignore file path |

### Global Properties

| Option | Type | Description |
|--------|------|-------------|
| `globalProperties` | object | Properties passed to OpenAPI Generator |

### Git Integration

| Option | Type | Description |
|--------|------|-------------|
| `gitHost` | string | Git host (e.g., `github.com`) |
| `gitUserId` | string | Git user/organization ID |
| `gitRepoId` | string | Git repository ID |

### Other Options

| Option | Type | Description |
|--------|------|-------------|
| `httpUserAgent` | string | Custom HTTP user agent |
| `releaseNote` | string | Release notes for generated code |
| `inputSpecRootDirectory` | string | Root directory for specs |
| `invokerPackage` | string | Package for invoker classes |
| `logToStderr` | boolean | Log to stderr instead of stdout |

## Configuration Examples

### Basic Configuration

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

### With Global Properties

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "options": {
        "inputSpec": "apps/my-app/swagger.json",
        "outputPath": "libs/api-client/src",
        "globalProperties": {
          "supportsES6": "true",
          "npmName": "@my-org/api-client",
          "npmVersion": "1.0.0",
          "providedInRoot": "true",
          "withInterfaces": "true",
          "useSingleRequestParameter": "true"
        }
      }
    }
  }
}
```

### Using a Configuration File

```json title="apps/my-app/openapi-config.json"
{
  "npmName": "@my-org/api-client",
  "npmVersion": "1.0.0",
  "ngVersion": "17.0.0",
  "providedInRoot": true,
  "withInterfaces": true,
  "useSingleRequestParameter": true,
  "supportsES6": true,
  "modelPropertyNaming": "camelCase",
  "enumPropertyNaming": "UPPERCASE"
}
```

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "options": {
        "inputSpec": "apps/my-app/swagger.json",
        "outputPath": "libs/api-client/src",
        "configFile": "apps/my-app/openapi-config.json"
      }
    }
  }
}
```

### Remote OpenAPI Specification

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "options": {
        "inputSpec": "https://api.example.com/v1/swagger.json",
        "outputPath": "libs/api-client/src",
        "auth": "bearer:your-api-token"
      }
    }
  }
}
```

### Environment-Specific Configurations

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "options": {
        "inputSpec": "apps/my-app/swagger.json",
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

Run with a specific configuration:

```bash
nx run my-app:generate-api:development
```

## Nx Caching

The plugin fully supports Nx's caching system. Generated output is cached based on:

- The OpenAPI specification file content
- All configuration options
- Plugin version

To enable caching in CI, configure [Nx Cloud](https://nx.app/) or local caching.

## Verification

After installation, verify the plugin is working:

```bash
nx list @lambda-solutions/nx-plugin-openapi
```

Expected output:

```
@lambda-solutions/nx-plugin-openapi

Executors:
- generate-api : Generate API client code from OpenAPI specifications
```

## Troubleshooting

### Java Not Found

OpenAPI Generator requires Java 8+:

```bash
java -version
```

If Java isn't installed, download it from [adoptium.net](https://adoptium.net/).

### Spec Validation Errors

Skip validation if needed:

```json
{
  "skipValidateSpec": true
}
```

### Caching Issues

Clear the Nx cache if you encounter stale output:

```bash
nx reset
```

## Migration to Modular Architecture

To migrate to the new modular architecture:

1. Install the new packages:
   ```bash
   npm install --save-dev @nx-plugin-openapi/core @nx-plugin-openapi/plugin-openapi
   ```

2. Update your executor:
   ```json
   {
     "executor": "@nx-plugin-openapi/core:generate-api",
     "options": {
       "generator": "openapi-tools",
       // ... other options remain the same
     }
   }
   ```

3. Optionally remove the legacy package:
   ```bash
   npm uninstall @lambda-solutions/nx-plugin-openapi
   ```

## Support

- [GitHub Issues](https://github.com/berger-engineering-io/nx-plugin-openapi/issues) - Report bugs and request features
- [Documentation](https://berger-engineering-io.github.io/nx-plugin-openapi/) - Full documentation site

## License

MIT
