---
title: Plugins Overview
description: Learn about the available plugins for Nx Plugin OpenAPI
---

# Plugins Overview

The Nx Plugin OpenAPI ecosystem provides a modular plugin architecture, allowing you to choose the code generator that best fits your project's needs.

## Available Plugins

| Plugin | Package | Generator Value | Description |
|--------|---------|-----------------|-------------|
| [OpenAPI Generator](/plugins/plugin-openapi/) | `@nx-plugin-openapi/plugin-openapi` | `openapi-tools` | Uses the battle-tested [OpenAPI Generator](https://openapi-generator.tech) |
| [hey-api](/plugins/plugin-hey-api/) | `@nx-plugin-openapi/plugin-hey-api` | `hey-api` | Uses [hey-api/openapi-ts](https://github.com/hey-api/openapi-ts) for modern TypeScript clients |
| [Legacy Plugin](/plugins/legacy-plugin/) | `@lambda-solutions/nx-plugin-openapi` | N/A (standalone) | Original standalone plugin for OpenAPI Generator |

## Architecture

The plugin system is built around a core package that provides:

- The `generate-api` executor
- Plugin loading and auto-installation
- Common configuration handling

```
┌─────────────────────────────────────────────────────────────┐
│                   @nx-plugin-openapi/core                    │
│       Executor, Plugin Loader, Auto-Installation             │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  plugin-openapi  │ │  plugin-hey-api  │ │  Custom Plugins  │
│  (OpenAPI Gen)   │ │  (hey-api)       │ │  (Your own!)     │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

## Choosing a Plugin

### OpenAPI Generator (`openapi-tools`)

**Best for:**
- Angular applications needing injectable services
- Projects requiring specific OpenAPI Generator templates
- Teams familiar with the OpenAPI Generator ecosystem
- Supporting multiple languages/frameworks from a single spec

**Features:**
- 50+ language/framework generators
- Extensive customization via templates
- Mature, battle-tested tooling

### hey-api (`hey-api`)

**Best for:**
- Modern TypeScript/JavaScript projects
- Projects prioritizing type safety and tree-shaking
- Fetch-based or Axios HTTP clients
- Simpler, more lightweight generated code

**Features:**
- TypeScript-first approach
- Excellent type inference
- Plugin-based architecture for customization
- Modern ESM output

### Legacy Plugin (`@lambda-solutions/nx-plugin-openapi`)

**Best for:**
- Existing projects already using this plugin
- Teams who want a single-package solution
- Angular projects with simpler requirements

**Features:**
- All-in-one package (no separate core/plugin)
- Dedicated executor for OpenAPI Generator
- Same Nx integration features

## Using Multiple Generators

You can use different generators for different projects in your monorepo:

```json title="libs/angular-client/project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "openapi-tools",
        "inputSpec": "specs/api.yaml",
        "outputPath": "libs/angular-client/src/generated"
      }
    }
  }
}
```

```json title="libs/ts-client/project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@nx-plugin-openapi/core:generate-api",
      "options": {
        "generator": "hey-api",
        "inputSpec": "specs/api.yaml",
        "outputPath": "libs/ts-client/src/generated"
      }
    }
  }
}
```

## Creating Custom Plugins

Need to integrate a different OpenAPI generator? The plugin architecture makes it easy to create custom plugins. See our [Creating Custom Plugins](/guides/creating-plugins/) guide for a complete walkthrough.

## Next Steps

- [OpenAPI Generator Plugin](/plugins/plugin-openapi/) - Full documentation for the OpenAPI Generator plugin
- [hey-api Plugin](/plugins/plugin-hey-api/) - Full documentation for the hey-api plugin
- [Legacy Plugin](/plugins/legacy-plugin/) - Documentation for the original standalone plugin
