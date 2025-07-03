---
title: Installation
description: Learn how to install and set up the Nx Plugin OpenAPI in your workspace
---

# Installation

This guide will walk you through installing the Nx Plugin OpenAPI in your Nx workspace.

## Prerequisites

Before installing the plugin, make sure you have:

- An existing Nx workspace
- Node.js and npm installed

## Option 1: Automatic Installation (Recommended)

The easiest way to install the plugin is using the `nx add` command:

```bash
nx add @lambda-solutions/nx-plugin-openapi
```

This command will:
- Install the plugin package
- Install the required peer dependency (`@openapitools/openapi-generator-cli`)
### Installation Options

You can customize the installation by passing options:

```bash
# Skip formatting after installation
nx add @lambda-solutions/nx-plugin-openapi --skipFormat=true
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `skipFormat` | boolean | `false` | Skip formatting the workspace after installation |

## Option 2: Manual Installation

If you prefer manual installation, you can install the packages separately:

### 1. Install the Plugin

```bash
npm install --save-dev @lambda-solutions/nx-plugin-openapi
```

### 2. Install OpenAPI Generator CLI

The plugin requires the OpenAPI Generator CLI as a peer dependency:

```bash
npm install --save-dev @openapitools/openapi-generator-cli
```

## Verification

After installation, verify the plugin is working by checking the available executors:

```bash
nx list @lambda-solutions/nx-plugin-openapi
```

You should see output similar to:

```
@lambda-solutions/nx-plugin-openapi

Executors:
- generate-api : Generate API client code from OpenAPI specifications
```

## Next Steps

Now that the plugin is installed, you can:

1. [Configure your first project](/getting-started/quick-start/) to use the `generate-api` executor
2. Learn about [advanced configuration options](/usage/configuration/)
3. Explore [examples](/usage/examples/) for common use cases

If you encounter issues, please [file an issue on GitHub](https://github.com/lambda-solutions/nx-plugin-openapi/issues).
