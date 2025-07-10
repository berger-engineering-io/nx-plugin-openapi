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

Automatically using the Nx CLI:

```bash
nx generate @lambda-solutions/nx-plugin-openapi:add-generate-api-target
```

The generator will walk you through the configuration.

You can also manually add the executor configuration to your `project.json` file:

```bash

```json title="apps/my-app/project.json"
{
  "name": "my-app",
  "targets": {
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "options": {
        "inputSpec": "apps/my-app/api.json",
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

The plugin will generate TypeScript Angular code in your specified output directory:

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




## Step 5: Set Up Nx Integration (Optional)

For better integration with Nx's build system, configure target defaults in your `nx.json`:

```json title="nx.json"
{
  "targetDefaults": {
    "generate-api": {
      "cache": true,
      "inputs": [
        "{projectRoot}/swagger.json",
        "{projectRoot}/openapitools.json",
        "{projectRoot}/api-config.json"
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
We recommend now to jump to the official documentation from OpenApiTools on how to use the generated client in your Angular application: [Using the Generated Client](https://openapi-generator.tech/docs/generators/typescript-angular#using-the-generated-client).

## Next Steps

Congratulations! You've successfully generated your first API client. Here's what you can do next:

- **[Explore Configuration Options](/usage/configuration/)** - Learn about advanced configuration options
- **[View Examples](/usage/examples/)** - See more complex usage patterns
- **[API Reference](/reference/generate-api/)** - Complete reference for all available options

## Common Issues

### Generator Not Found

### Output Directory Conflicts

The plugin automatically cleans the output directory before generation. Make sure the `outputPath` doesn't contain important files that shouldn't be deleted.
