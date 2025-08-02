---
title: generate-api Executor
description: Complete reference for the generate-api executor
---

# generate-api Executor

The `generate-api` executor generates TypeScript Angular API client code from OpenAPI specifications using the OpenAPI Generator.

## Usage

```bash
nx run <project>:generate-api
```

## Basic Configuration

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

### `inputSpec`

- **Type:** `string | Record<string, string>`
- **Required:** Yes
- **Description:** Path to the OpenAPI specification file(s) or URL(s)

The input specification can be:
- A single string: Path to one OpenAPI specification (backward compatible)
- An object: Multiple specifications mapped by service name (for microservices)

#### Single Specification (String)

For projects with a single API:

```json
{
  "inputSpec": "apps/my-app/swagger.json"
}
```

```json
{
  "inputSpec": "https://api.example.com/swagger.json"
}
```

#### Multiple Specifications (Object)

For microservice architectures with multiple APIs:

```json
{
  "inputSpec": {
    "ms-product": "apps/my-app/ms-product.json",
    "ms-user": "apps/my-app/ms-user.json",
    "ms-inventory": "apps/my-app/ms-inventory.json"
  }
}
```

When using multiple specifications:
- Each key becomes a subdirectory name under `outputPath`
- Each API is generated in its own subdirectory
- All configured options are applied to each generation

**Generated structure for multiple specs:**
```
libs/api/src/
  ms-product/
    // generated API for product service
  ms-user/
    // generated API for user service
  ms-inventory/
    // generated API for inventory service
```

### `outputPath`

- **Type:** `string`
- **Required:** Yes
- **Description:** Output directory for the generated API client code

The output directory will be cleaned before generation. Relative paths are resolved from the workspace root.

**Examples:**
```json
{
  "outputPath": "libs/api-client/src"
}
```

```json
{
  "outputPath": "apps/my-app/src/app/generated"
}
```

## Optional Configuration Options

### `configFile`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Path to OpenAPI Generator configuration file

Allows you to specify detailed generation options in a separate JSON file.

**Example:**
```json
{
  "configFile": "apps/my-app/openapi-config.json"
}
```

### `skipValidateSpec`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Skip validation of the OpenAPI specification

Set to `true` for faster generation when you're confident your specification is valid.

**Example:**
```json
{
  "skipValidateSpec": true
}
```

## Authentication & Security

### `auth`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Authentication configuration for accessing remote specifications

**Example:**
```json
{
  "auth": "bearer:your-api-token"
}
```

## Naming & Package Configuration

### `apiNameSuffix`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Suffix to append to generated API class names

**Example:**
```json
{
  "apiNameSuffix": "Client"
}
```

### `apiPackage`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Package name for API classes

**Example:**
```json
{
  "apiPackage": "com.example.api"
}
```

### `packageName`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Package name for the generated client library

**Example:**
```json
{
  "packageName": "@my-org/api-client"
}
```

### `modelNamePrefix`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Prefix for generated model class names

**Example:**
```json
{
  "modelNamePrefix": "Api"
}
```

### `modelNameSuffix`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Suffix for generated model class names

**Example:**
```json
{
  "modelNameSuffix": "Model"
}
```

### `modelPackage`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Package name for model classes

**Example:**
```json
{
  "modelPackage": "com.example.models"
}
```

## Project Metadata

### `artifactId`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Artifact ID for the generated code

**Example:**
```json
{
  "artifactId": "my-api-client"
}
```

### `artifactVersion`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Version of the generated artifact

**Example:**
```json
{
  "artifactVersion": "1.0.0"
}
```

### `groupId`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Group ID for the generated code

**Example:**
```json
{
  "groupId": "com.example"
}
```

## Generation Behavior

### `dryRun`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Perform a dry run without actually generating files

Useful for testing configuration without creating files.

**Example:**
```json
{
  "dryRun": true
}
```

### `enablePostProcessFile`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enable post-processing of generated files

**Example:**
```json
{
  "enablePostProcessFile": true
}
```

### `minimalUpdate`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Only update files that have actually changed

**Example:**
```json
{
  "minimalUpdate": true
}
```

### `skipOverwrite`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Skip overwriting existing files

**Example:**
```json
{
  "skipOverwrite": true
}
```

### `removeOperationIdPrefix`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Remove operation ID prefixes from generated method names

**Example:**
```json
{
  "removeOperationIdPrefix": true
}
```

### `skipOperationExample`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Skip generating operation examples in the code

**Example:**
```json
{
  "skipOperationExample": true
}
```

### `strictSpec`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Use strict specification validation

**Example:**
```json
{
  "strictSpec": true
}
```

## Templates & Customization

### `templateDirectory`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Directory containing custom templates for code generation

**Example:**
```json
{
  "templateDirectory": "apps/my-app/templates"
}
```

### `ignoreFileOverride`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Path to a custom ignore file

**Example:**
```json
{
  "ignoreFileOverride": "apps/my-app/.openapi-generator-ignore"
}
```

## Advanced Configuration

### `globalProperties`

- **Type:** `object`
- **Default:** `undefined`
- **Description:** Global properties for the OpenAPI Generator

An object where keys are property names and values are property values.

**Example:**
```json
{
  "globalProperties": {
    "supportsES6": "true",
    "npmName": "@my-org/api-client",
    "npmVersion": "1.0.0",
    "providedInRoot": "true",
    "withInterfaces": "true"
  }
}
```

### `httpUserAgent`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Custom HTTP user agent string

**Example:**
```json
{
  "httpUserAgent": "MyApp/1.0.0"
}
```

### `releaseNote`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Release notes for the generated code

**Example:**
```json
{
  "releaseNote": "Initial release of the API client"
}
```

### `inputSpecRootDirectory`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Root directory for input specifications

**Example:**
```json
{
  "inputSpecRootDirectory": "specs/"
}
```

### `invokerPackage`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Package name for invoker classes

**Example:**
```json
{
  "invokerPackage": "com.example.invoker"
}
```

## Git Integration

### `gitHost`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Git host for the repository

**Example:**
```json
{
  "gitHost": "github.com"
}
```

### `gitUserId`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Git user ID

**Example:**
```json
{
  "gitUserId": "my-username"
}
```

### `gitRepoId`

- **Type:** `string`
- **Default:** `undefined`
- **Description:** Git repository ID

**Example:**
```json
{
  "gitRepoId": "my-api-client"
}
```

## Logging & Debugging

### `logToStderr`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Log output to stderr instead of stdout

**Example:**
```json
{
  "logToStderr": true
}
```

## Complete Example

Here's a comprehensive example showing many options:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "options": {
        "inputSpec": "apps/demo/swagger.json",
        "outputPath": "libs/api-client/src",
        "configFile": "apps/demo/openapi-config.json",
        "packageName": "@my-org/demo-api-client",
        "apiNameSuffix": "Service",
        "modelNamePrefix": "Api",
        "modelNameSuffix": "Model",
        "skipValidateSpec": false,
        "strictSpec": true,
        "globalProperties": {
          "supportsES6": "true",
          "npmName": "@my-org/demo-api-client",
          "npmVersion": "1.0.0",
          "providedInRoot": "true",
          "withInterfaces": "true"
        }
      },
      "outputs": ["{options.outputPath}"]
    }
  }
}
```

### Multiple APIs Example

For microservice architectures:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "options": {
        "inputSpec": {
          "auth-service": "apis/auth-service.yaml",
          "product-service": "apis/product-service.yaml",
          "order-service": "apis/order-service.yaml",
          "payment-service": "apis/payment-service.yaml"
        },
        "outputPath": "libs/api-clients/src",
        "packageName": "@my-org/api-clients",
        "apiNameSuffix": "ApiService",
        "modelNamePrefix": "Api",
        "globalProperties": {
          "supportsES6": "true",
          "providedInRoot": "true",
          "withInterfaces": "true"
        }
      },
      "outputs": ["{options.outputPath}"]
    }
  }
}
```

This will generate:
```
libs/api-clients/src/
  auth-service/
    // Auth API client
  product-service/
    // Product API client
  order-service/
    // Order API client
  payment-service/
    // Payment API client
```

## Environment-Specific Configuration

Use configurations for different environments:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "options": {
        "inputSpec": "apps/demo/swagger.json",
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

Run with configuration:
```bash
nx run demo:generate-api:development
```