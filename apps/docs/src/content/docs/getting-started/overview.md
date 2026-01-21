---
title: Overview
description: Learn about the Nx Plugin OpenAPI and what it can do for your project
---

# Overview

The Nx Plugin OpenAPI brings first-class support for generating API client code from OpenAPI specifications within your Nx workspace, leveraging all the powerful features of the Nx task pipeline.

## Plugin Architecture

The project is structured as a modular plugin system, allowing you to choose the code generator that best fits your needs:

```
┌─────────────────────────────────────────────────────────────┐
│                   @nx-plugin-openapi/core                    │
│       Executor, Plugin Loader, Auto-Installation             │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌────────────────────────┐           ┌────────────────────────┐
│   plugin-openapi       │           │   plugin-hey-api       │
│   (OpenAPI Generator)  │           │   (hey-api/openapi-ts) │
└────────────────────────┘           └────────────────────────┘
```

### Available Generators

| Generator | Plugin | Description |
|-----------|--------|-------------|
| `openapi-tools` | `@nx-plugin-openapi/plugin-openapi` | Uses [OpenAPI Generator](https://openapi-generator.tech) - supports 50+ languages including TypeScript Angular |
| `hey-api` | `@nx-plugin-openapi/plugin-hey-api` | Uses [hey-api/openapi-ts](https://github.com/hey-api/openapi-ts) - modern TypeScript-first client generation |

## Key Benefits

### 🚀 **Nx Native Integration**
- Uses standard Nx executors and configuration
- Integrates with Nx's dependency graph
- Supports Nx's powerful caching system
- Works with Nx Cloud for distributed caching

### ⚡ **Smart Caching**
- Only regenerates when OpenAPI specs change
- Supports both local and remote OpenAPI specifications
- Caches based on file content, not timestamps
- Dramatically speeds up builds in large monorepos

### 🔧 **Flexible Plugin System**
- Choose the generator that fits your project needs
- Plugins are auto-installed when first used
- Pass generator-specific options via `generatorOptions`
- Support for multiple OpenAPI specifications in a single target

### 📦 **Production Ready**
- Battle-tested generators used in thousands of production applications
- Comprehensive configuration options for customization
- TypeScript-safe configuration through JSON schema

## Choosing a Generator

### OpenAPI Generator (`openapi-tools`)

Best for:
- Angular applications needing injectable services
- Projects requiring specific OpenAPI Generator templates
- Teams familiar with OpenAPI Generator ecosystem
- Supporting multiple languages/frameworks

### hey-api (`hey-api`)

Best for:
- Modern TypeScript/JavaScript projects
- Projects prioritizing type safety
- Fetch-based HTTP clients
- Simpler, more lightweight generated code

## Next Steps

Ready to get started? Let's [install the plugin](/getting-started/installation/) in your Nx workspace.
