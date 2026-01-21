---
title: Examples
description: Common usage patterns and examples for the generate-api executor
---

# Examples

This page provides practical examples for common use cases with the `generate-api` executor. Examples are provided for both the OpenAPI Generator (`openapi-tools`) and hey-api (`hey-api`) generators.

## Basic Examples

### Local OpenAPI Specification (OpenAPI Generator)

Generate an API client from a local OpenAPI specification file using OpenAPI Generator:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "openapi-tools",
        "inputSpec": "apps/demo/swagger.json",
        "outputPath": "apps/demo/src/app/api"
      },
      "outputs": ["{options.outputPath}"]
    }
  }
}
```

### Local OpenAPI Specification (hey-api)

Generate an API client using hey-api:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "hey-api",
        "inputSpec": "apps/demo/openapi.yaml",
        "outputPath": "apps/demo/src/app/api"
      },
      "outputs": ["{options.outputPath}"]
    }
  }
}
```

### Remote OpenAPI Specification

Generate from a remote URL (works with both generators):

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "openapi-tools",
        "inputSpec": "https://api.example.com/swagger.json",
        "outputPath": "apps/demo/src/app/api"
      }
    }
  }
}
```

:::tip[Caching with Remote URLs]
Nx caching works with remote URLs too! The executor will cache based on the content of the remote specification, so unchanged specs won't trigger regeneration.
:::

## Configuration Examples

### With Custom Configuration File

Use a separate configuration file for detailed OpenAPI Generator options:

```json title="apps/demo/openapi-config.json"
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
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "inputSpec": "apps/demo/openapi.json",
        "outputPath": "apps/demo/src/app/api"
        "configFile": "apps/demo/openapi-config.json"
      }
    }
  }
}
```

## Advanced Examples

### Custom Package Configuration

Generate with custom package information and naming:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "inputSpec": "apps/demo/swagger.json",
        "outputPath": "libs/api-client/src",
        "packageName": "@my-org/demo-api-client",
        "apiNameSuffix": "Service",
        "modelNamePrefix": "Api",
        "modelNameSuffix": "Model"
      }
    }
  }
}
```

### Global Properties Configuration

Use global properties for fine-tuned control:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "inputSpec": "apps/demo/swagger.json",
        "outputPath": "libs/api-client/src",
        "globalProperties": {
          "supportsES6": "true",
          "npmName": "@my-org/api-client",
          "npmVersion": "2.0.0",
          "providedInRoot": "true",
          "withInterfaces": "true",
          "useSingleRequestParameter": "true",
          "enumPropertyNaming": "UPPERCASE"
        }
      }
    }
  }
}
```

### Authentication for Remote APIs

Access protected OpenAPI specifications:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "inputSpec": "https://api.example.com/swagger.json",
        "outputPath": "libs/api-client/src",
        "auth": "bearer:your-api-token-here",
        "httpUserAgent": "MyApp/1.0.0"
      }
    }
  }
}
```

### Custom Templates

Use custom templates for code generation:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "inputSpec": "apps/demo/swagger.json",
        "outputPath": "libs/api-client/src",
        "templateDirectory": "apps/demo/templates",
        "enablePostProcessFile": true
      }
    }
  }
}
```

## Environment-Specific Examples

### Development vs Production

Configure different behaviors for different environments:

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
          "skipValidateSpec": true,
          "dryRun": false
        },
        "production": {
          "inputSpec": "https://api.prod.example.com/swagger.json",
          "strictSpec": true,
          "skipValidateSpec": false
        },
        "test": {
          "dryRun": true,
          "skipValidateSpec": true
        }
      }
    }
  }
}
```

Usage:
```bash
# Development environment
nx run demo:generate-api:development

# Production environment  
nx run demo:generate-api:production

# Test run
nx run demo:generate-api:test
```

## Multiple API Clients

### Separate Targets for Different APIs

Generate multiple API clients from different specifications:

```json title="project.json"
{
  "targets": {
    "generate-user-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "inputSpec": "apps/demo/user-api.json",
        "outputPath": "libs/user-api-client/src",
        "packageName": "@my-org/user-api-client"
      }
    },
    "generate-product-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "inputSpec": "apps/demo/product-api.json",
        "outputPath": "libs/product-api-client/src",
        "packageName": "@my-org/product-api-client"
      }
    },
    "generate-all-apis": {
      "executor": "nx:run-commands",
      "options": {
        "commands": [
          "nx run demo:generate-user-api",
          "nx run demo:generate-product-api"
        ],
        "parallel": true
      }
    }
  }
}
```

## Monorepo Examples

### Shared Library Generation

Generate a shared API client library used across multiple apps:

```json title="libs/shared-api-client/project.json"
{
  "name": "shared-api-client",
  "targets": {
    "generate": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "inputSpec": "https://api.company.com/swagger.json",
        "outputPath": "libs/shared-api-client/src/lib/generated",
        "packageName": "@my-org/shared-api-client",
        "globalProperties": {
          "providedInRoot": "true",
          "ngVersion": "17.0.0"
        }
      }
    },
    "build": {
      "dependsOn": ["generate"]
    }
  }
}
```

### Workspace-Level Configuration

Configure API generation at the workspace level in `nx.json`:

```json title="nx.json"
{
  "targetDefaults": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "cache": true,
      "inputs": [
        "{projectRoot}/swagger.json",
        "{projectRoot}/openapi.json", 
        "{projectRoot}/api-spec.yaml",
        "{projectRoot}/openapi-config.json"
      ]
    },
    "build": {
      "dependsOn": ["^build", "^generate-api", "generate-api"]
    }
  }
}
```

## hey-api Specific Examples

### Basic hey-api Configuration

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
          "client": "fetch"
        }
      },
      "outputs": ["{options.outputPath}"]
    }
  }
}
```

### hey-api with Custom Plugins

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
          "client": "axios",
          "plugins": ["@hey-api/schemas", "@hey-api/services"]
        }
      }
    }
  }
}
```

### hey-api with Multiple Services

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "hey-api",
        "inputSpec": {
          "users-api": "apis/users-openapi.yaml",
          "products-api": "apis/products-openapi.yaml"
        },
        "outputPath": "libs/api-clients/src"
      }
    }
  }
}
```

## Troubleshooting Examples

### Debug Generation Issues (OpenAPI Generator)

Use dry run to test configuration without generating files:

```json title="project.json"
{
  "targets": {
    "debug-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "openapi-tools",
        "inputSpec": "apps/demo/swagger.json",
        "outputPath": "libs/api-client/src",
        "dryRun": true,
        "logToStderr": true
      }
    }
  }
}
```

### Handle Large APIs (OpenAPI Generator)

For large OpenAPI specifications, optimize generation:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "openapi-tools",
        "inputSpec": "apps/demo/large-api.json",
        "outputPath": "libs/api-client/src",
        "skipValidateSpec": true,
        "minimalUpdate": true,
        "skipOperationExample": true
      }
    }
  }
}
```

## Next Steps

- [Learn about Nx Integration](/usage/nx-integration/) for advanced workspace setup
- [API Reference](/reference/generate-api/) for complete option details
- [Configuration Guide](/usage/configuration/) for detailed option explanations
