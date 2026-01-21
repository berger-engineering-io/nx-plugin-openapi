---
title: Quick Start
description: Get up and running with your first API client generation
---

# Quick Start

This guide will help you generate your first API client using the Nx Plugin OpenAPI.

## Step 1: Prepare Your OpenAPI Specification

You'll need an OpenAPI specification file. This can be:
- A local JSON or YAML file
- A remote URL endpoint

For this example, we'll use a local file. Create a simple OpenAPI spec:

```json title="apps/my-app/swagger.json"
{
  "openapi": "3.0.0",
  "info": {
    "title": "Sample API",
    "version": "1.0.0"
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "Get all users",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/User"
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "name": {
            "type": "string"
          },
          "email": {
            "type": "string",
            "format": "email"
          }
        }
      }
    }
  }
}
```

## Step 2: Configure the Executor

Add the `generate-api` executor to your project's `project.json`.

### Using the Generator (Recommended)

The easiest way is to use the interactive generator:

```bash
nx generate @nx-plugin-openapi/core:add-generate-api-target --project=my-app
```

The generator will walk you through the configuration options.

### Manual Configuration

You can also manually add the executor configuration to your `project.json` file:

#### Using OpenAPI Generator (openapi-tools)

```json title="apps/my-app/project.json"
{
  "name": "my-app",
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "openapi-tools",
        "inputSpec": "apps/my-app/swagger.json",
        "outputPath": "apps/my-app/src/app/api"
      },
      "outputs": ["{options.outputPath}"]
    },
    "build": {
      "dependsOn": ["generate-api"]
    }
  }
}
```

#### Using hey-api

```json title="apps/my-app/project.json"
{
  "name": "my-app",
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "hey-api",
        "inputSpec": "apps/my-app/swagger.json",
        "outputPath": "apps/my-app/src/app/api"
      },
      "outputs": ["{options.outputPath}"]
    },
    "build": {
      "dependsOn": ["generate-api"]
    }
  }
}
```

:::tip[Generator Selection]
- **`openapi-tools`**: Best for Angular projects needing injectable services, or when using OpenAPI Generator's extensive template ecosystem.
- **`hey-api`**: Best for modern TypeScript projects wanting simpler, more type-safe generated code.
:::



## Step 3: Generate the API Client

Run the executor to generate your API client:

```bash
nx run my-app:generate-api
```

You should see output similar to:

```
✔ Starting to generate API from provided OpenAPI spec...
✔ Cleaning outputPath libs/api-client/src first
✔ API generation completed successfully.
```

## Step 4: Examine the Generated Code

The generated code structure varies based on the generator you chose:

### OpenAPI Generator (openapi-tools) Output

```
libs/api-client/src/
├── api/
│   ├── api.ts
│   ├── default.service.ts
│   └── ...
├── model/
│   ├── models.ts
│   ├── user.ts
│   └── ...
├── configuration.ts
├── index.ts
└── variables.ts
```

### hey-api Output

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

## Step 5: Set Up Nx Integration (Optional)

For better integration with Nx's build system, configure target defaults in your `nx.json`:

```json title="nx.json"
{
  "targetDefaults": {
    "generate-api": {
      "cache": true,
      "inputs": [
        "{projectRoot}/swagger.json",
        "{projectRoot}/openapi.yaml",
        "{projectRoot}/openapi-config.json"
      ]
    },
    "build": {
      "dependsOn": ["^build", "^generate-api", "generate-api"]
    }
  }
}
```

This configuration:
- Enables caching for the `generate-api` executor
- Makes builds depend on API generation
- Includes relevant input files for cache invalidation

## Step 6: Use the Generated Client

The usage of the generated client depends on which generator you chose:

- **OpenAPI Generator**: See the [official documentation](https://openapi-generator.tech/docs/generators/typescript-angular#using-the-generated-client) for Angular integration.
- **hey-api**: See the [hey-api documentation](https://heyapi.dev/) for usage examples.

## Next Steps

Congratulations! You've successfully generated your first API client. Here's what you can do next:

- **[Explore Configuration Options](/usage/configuration/)** - Learn about advanced configuration options
- **[View Examples](/usage/examples/)** - See more complex usage patterns
- **[API Reference](/reference/generate-api/)** - Complete reference for all available options

## Common Issues

### Plugin Not Found

If you see an error about a plugin not being found, ensure the plugin package is installed:

```bash
# For openapi-tools
npm install --save-dev @nx-plugin-openapi/plugin-openapi @openapitools/openapi-generator-cli

# For hey-api
npm install --save-dev @nx-plugin-openapi/plugin-hey-api @hey-api/openapi-ts
```

### Output Directory Conflicts

The plugin automatically cleans the output directory before generation. Make sure the `outputPath` doesn't contain important files that shouldn't be deleted.
