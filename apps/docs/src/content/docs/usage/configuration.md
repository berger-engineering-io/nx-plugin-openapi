---
title: Configuration
description: Learn how to configure the generate-api executor with all available options
---

# Configuration
See [OpenApiTools docs](https://openapi-generator.tech/docs/usage/#generate) for all options.


The `generate-api` executor offers extensive configuration options to customize the generated API client code. This page covers all available configuration options and how to use them effectively.

## Basic Configuration

At minimum, you need to specify the input specification and output path:

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

## Required Options

| Option | Type | Description |
|--------|------|-------------|
| `inputSpec` | string | Path to the OpenAPI specification file (local file or URL) |
| `outputPath` | string | Output directory for the generated client |

## Core Options

### `configFile`
```json
{
  "configFile": "apps/my-app/openapi-config.json"
}
```
Path to an OpenAPI Generator configuration file. This allows you to specify detailed generation options in a separate file.

### `skipValidateSpec`
```json
{
  "skipValidateSpec": true
}
```
Skip validation of the OpenAPI specification. Useful for faster generation when you're confident your spec is valid.

## Authentication & Security

### `auth`
```json
{
  "auth": "bearer:your-token-here"
}
```
Authentication configuration for accessing remote OpenAPI specifications.

## Naming & Organization

### `apiNameSuffix`
```json
{
  "apiNameSuffix": "Client"
}
```
Suffix to append to generated API class names.

### `apiPackage`
```json
{
  "apiPackage": "com.example.api"
}
```
Package name for API classes.

### `packageName`
```json
{
  "packageName": "@my-org/api-client"
}
```
Package name for the generated client library.

### Model Naming

```json
{
  "modelNamePrefix": "Api",
  "modelNameSuffix": "Model",
  "modelPackage": "com.example.models"
}
```

## Project Information

### `artifactId` & `artifactVersion`
```json
{
  "artifactId": "my-api-client",
  "artifactVersion": "1.0.0"
}
```

### `groupId`
```json
{
  "groupId": "com.example"
}
```

## Generation Behavior

### `dryRun`
```json
{
  "dryRun": true
}
```
Perform a dry run without actually generating files. Useful for testing configuration.

### `enablePostProcessFile`
```json
{
  "enablePostProcessFile": true
}
```
Enable post-processing of generated files.

### `minimalUpdate`
```json
{
  "minimalUpdate": true
}
```
Only update files that have actually changed.

### `skipOverwrite`
```json
{
  "skipOverwrite": true
}
```
Skip overwriting existing files.

### `removeOperationIdPrefix`
```json
{
  "removeOperationIdPrefix": true
}
```
Remove operation ID prefixes from generated method names.

### `skipOperationExample`
```json
{
  "skipOperationExample": true
}
```
Skip generating operation examples in the code.

### `strictSpec`
```json
{
  "strictSpec": true
}
```
Use strict specification validation.

## Templates & Customization

### `templateDirectory`
```json
{
  "templateDirectory": "apps/my-app/templates"
}
```
Directory containing custom templates for code generation.

### `ignoreFileOverride`
```json
{
  "ignoreFileOverride": "apps/my-app/.openapi-generator-ignore"
}
```
Path to a custom ignore file.

## Advanced Options

### `globalProperties`
```json
{
  "globalProperties": {
    "supportsES6": "true",
    "npmName": "@my-org/api-client",
    "npmVersion": "1.0.0",
    "providedInRoot": "true",
    "withInterfaces": "true",
    "useSingleRequestParameter": "true"
  }
}
```
Global properties passed to the OpenAPI Generator.

### `httpUserAgent`
```json
{
  "httpUserAgent": "MyApp/1.0.0"
}
```
Custom HTTP user agent string.

### `releaseNote`
```json
{
  "releaseNote": "Initial release of the API client"
}
```
Release notes for the generated code.

### `inputSpecRootDirectory`
```json
{
  "inputSpecRootDirectory": "specs/"
}
```
Root directory for input specifications.

### `invokerPackage`
```json
{
  "invokerPackage": "com.example.invoker"
}
```
Package name for invoker classes.

## Git Integration

### Git Repository Information
```json
{
  "gitHost": "github.com",
  "gitUserId": "my-username",
  "gitRepoId": "my-api-client"
}
```

## Logging & Debugging

### `logToStderr`
```json
{
  "logToStderr": true
}
```
Log output to stderr instead of stdout.

## Configuration File Example

Instead of specifying all options in `project.json`, you can use a separate configuration file:

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

Then reference it:

```json title="project.json"
{
  "generate-api": {
    "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
    "options": {
      "inputSpec": "apps/my-app/swagger.json",
      "outputPath": "libs/api-client/src",
      "configFile": "apps/my-app/openapi-config.json"
    }
  }
}
```

## Environment-Specific Configuration

You can use different configurations for different environments:

```json title="project.json"
{
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
```

Run with specific configuration:
```bash
nx run my-app:generate-api:development
```

## Next Steps

- [View Examples](/usage/examples/) for common configuration patterns
- [API Reference](/reference/options/) for complete option details
- [Nx Integration](/usage/nx-integration/) for advanced Nx workspace setup
