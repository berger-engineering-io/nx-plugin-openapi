---
title: Overview
description: Learn about the Nx Plugin OpenAPI and what it can do for your project
---

# Overview

The Nx Plugin OpenAPI brings first class support for using the [OpenAPI Generator](https://openapi-generator.tech) within your Nx workspace leveraging all powerful features of the Nx task pipeline.

## What is OpenAPI Generator?

[OpenAPI Generator](https://openapi-generator.tech) is a powerful tool that can generate API client libraries, server stubs, documentation, and configuration files from OpenAPI specifications. This plugin specifically focuses on generating TypeScript Angular clients.

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

### 🔧 **Flexible Configuration**
- Support for Generator options
- TypeScript-safe configuration through JSON schema

### 📦 **Production Ready**
- We rely on the battle-proven [OpenAPI Generator](https://openapi-generator.tech/docs/generators/typescript-angular) for generating Angular TypeScript clients which does power thousands of production applications.

## Next Steps

Ready to get started? Let's [install the plugin](/getting-started/installation/) in your Nx workspace.
