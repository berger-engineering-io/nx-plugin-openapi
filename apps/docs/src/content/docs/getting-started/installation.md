---
title: Installation
description: Learn how to install and set up the Nx Plugin OpenAPI in your workspace
---

# Installation

This guide will walk you through installing the Nx Plugin OpenAPI in your Nx workspace.

## Prerequisites

Before installing the plugin, make sure you have:

- An existing Nx workspace (version 19+)
- Node.js and npm installed

## Core Package Installation

The recommended approach is to use the new modular package structure with the core package and your choice of generator plugin.

### Step 1: Install the Core Package

```bash
nx add @nx-plugin-openapi/core 
```

or 
```bash
npm install --save-dev @nx-plugin-openapi/core
```

### Step 2: Install a Generator Plugin

Choose and install one or more generator plugins based on your needs:

#### Option A: OpenAPI Generator (openapi-tools)

For projects using [OpenAPI Generator](https://openapi-generator.tech):

```bash
npm install --save-dev @nx-plugin-openapi/plugin-openapi @openapitools/openapi-generator-cli
```

#### Option B: hey-api

For projects using [hey-api/openapi-ts](https://github.com/hey-api/openapi-ts):

```bash
npm install --save-dev @nx-plugin-openapi/plugin-hey-api @hey-api/openapi-ts
```

:::tip[Auto-Installation]
Generator plugins and their peer dependencies are auto-installed when first used. If you specify `"generator": "openapi-tools"` or `"generator": "hey-api"` and the plugin isn't installed, the core package will attempt to install it automatically.
:::

## Package Overview

| Package | Purpose | Peer Dependencies |
|---------|---------|-------------------|
| `@nx-plugin-openapi/core` | Core executor and plugin system | `@nx/devkit` |
| `@nx-plugin-openapi/plugin-openapi` | OpenAPI Generator plugin | `@openapitools/openapi-generator-cli` |
| `@nx-plugin-openapi/plugin-hey-api` | hey-api plugin | `@hey-api/openapi-ts` |

## Legacy Package Installation

For backward compatibility, the original package is still available:

```bash
# Legacy package (OpenAPI Generator only)
npm install --save-dev @lambda-solutions/nx-plugin-openapi @openapitools/openapi-generator-cli
```

:::note[Migration]
If you're using the legacy `@lambda-solutions/nx-plugin-openapi` package, consider migrating to the new modular structure for better flexibility and support for multiple generators.
:::

## Verification

After installation, verify the packages are installed correctly:

```bash
# Check core package
nx list @nx-plugin-openapi/core
```

You should see output similar to:

```
@nx-plugin-openapi/core

Executors:
- generate-api : Generate API code using a selected generator plugin

Generators:
- add-generate-api-target : Add a generate-api target using the core executor
- init : Initialize core plugin defaults
```

## Using the Generator

You can quickly add a `generate-api` target to an existing project:

```bash
nx generate @nx-plugin-openapi/core:add-generate-api-target --project=my-app
```

This interactive generator will guide you through the configuration options.

## Next Steps

Now that the plugin is installed, you can:

1. [Configure your first project](/getting-started/quick-start/) to use the `generate-api` executor
2. Learn about [advanced configuration options](/usage/configuration/)
3. Explore [examples](/usage/examples/) for common use cases

If you encounter issues, please [file an issue on GitHub](https://github.com/berger-engineering-io/nx-plugin-openapi/issues).
