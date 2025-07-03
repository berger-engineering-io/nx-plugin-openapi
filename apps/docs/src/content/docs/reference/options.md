---
title: All Options
description: Complete alphabetical reference of all available options
---

# All Options Reference

This page provides a complete alphabetical reference of all available options for the `generate-api` executor.

## A

### `apiNameSuffix`
- **Type:** `string`
- **Required:** No
- **Description:** Suffix to append to generated API class names
- **Example:** `"Client"` → `UserApiClient`

### `apiPackage`
- **Type:** `string`
- **Required:** No
- **Description:** Package name for API classes
- **Example:** `"com.example.api"`

### `artifactId`
- **Type:** `string`
- **Required:** No
- **Description:** Artifact ID for the generated code
- **Example:** `"my-api-client"`

### `artifactVersion`
- **Type:** `string`
- **Required:** No
- **Description:** Version of the generated artifact
- **Example:** `"1.0.0"`

### `auth`
- **Type:** `string`
- **Required:** No
- **Description:** Authentication configuration for accessing remote specifications
- **Example:** `"bearer:your-api-token"`

## C

### `configFile`
- **Type:** `string`
- **Required:** No
- **Description:** Path to OpenAPI Generator configuration file
- **Example:** `"apps/my-app/openapi-config.json"`

## D

### `dryRun`
- **Type:** `boolean`
- **Required:** No
- **Default:** `false`
- **Description:** Perform a dry run without actually generating files
- **Example:** `true`

## E

### `enablePostProcessFile`
- **Type:** `boolean`
- **Required:** No
- **Default:** `false`
- **Description:** Enable post-processing of generated files
- **Example:** `true`

## G

### `gitHost`
- **Type:** `string`
- **Required:** No
- **Description:** Git host for the repository
- **Example:** `"github.com"`

### `gitRepoId`
- **Type:** `string`
- **Required:** No
- **Description:** Git repository ID
- **Example:** `"my-api-client"`

### `gitUserId`
- **Type:** `string`
- **Required:** No
- **Description:** Git user ID
- **Example:** `"my-username"`

### `globalProperties`
- **Type:** `object`
- **Required:** No
- **Description:** Global properties for the OpenAPI Generator
- **Example:** 
  ```json
  {
    "supportsES6": "true",
    "npmName": "@my-org/api-client",
    "providedInRoot": "true"
  }
  ```

### `groupId`
- **Type:** `string`
- **Required:** No
- **Description:** Group ID for the generated code
- **Example:** `"com.example"`

## H

### `httpUserAgent`
- **Type:** `string`
- **Required:** No
- **Description:** Custom HTTP user agent string
- **Example:** `"MyApp/1.0.0"`

## I

### `ignoreFileOverride`
- **Type:** `string`
- **Required:** No
- **Description:** Path to a custom ignore file
- **Example:** `"apps/my-app/.openapi-generator-ignore"`

### `inputSpec`
- **Type:** `string`
- **Required:** Yes
- **Description:** Path to the OpenAPI specification file or URL
- **Examples:** 
  - `"apps/my-app/swagger.json"`
  - `"https://api.example.com/swagger.json"`

### `inputSpecRootDirectory`
- **Type:** `string`
- **Required:** No
- **Description:** Root directory for input specifications
- **Example:** `"specs/"`

### `invokerPackage`
- **Type:** `string`
- **Required:** No
- **Description:** Package name for invoker classes
- **Example:** `"com.example.invoker"`

## L

### `logToStderr`
- **Type:** `boolean`
- **Required:** No
- **Default:** `false`
- **Description:** Log output to stderr instead of stdout
- **Example:** `true`

## M

### `minimalUpdate`
- **Type:** `boolean`
- **Required:** No
- **Default:** `false`
- **Description:** Only update files that have actually changed
- **Example:** `true`

### `modelNamePrefix`
- **Type:** `string`
- **Required:** No
- **Description:** Prefix for generated model class names
- **Example:** `"Api"` → `ApiUser`

### `modelNameSuffix`
- **Type:** `string`
- **Required:** No
- **Description:** Suffix for generated model class names
- **Example:** `"Model"` → `UserModel`

### `modelPackage`
- **Type:** `string`
- **Required:** No
- **Description:** Package name for model classes
- **Example:** `"com.example.models"`

## O

### `outputPath`
- **Type:** `string`
- **Required:** Yes
- **Description:** Output directory for the generated client code
- **Example:** `"libs/api-client/src"`

## P

### `packageName`
- **Type:** `string`
- **Required:** No
- **Description:** Package name for the generated client library
- **Example:** `"@my-org/api-client"`

## R

### `releaseNote`
- **Type:** `string`
- **Required:** No
- **Description:** Release notes for the generated code
- **Example:** `"Initial release of the API client"`

### `removeOperationIdPrefix`
- **Type:** `boolean`
- **Required:** No
- **Default:** `false`
- **Description:** Remove operation ID prefixes from generated method names
- **Example:** `true`

## S

### `skipOperationExample`
- **Type:** `boolean`
- **Required:** No
- **Default:** `false`
- **Description:** Skip generating operation examples in the code
- **Example:** `true`

### `skipOverwrite`
- **Type:** `boolean`
- **Required:** No
- **Default:** `false`
- **Description:** Skip overwriting existing files
- **Example:** `true`

### `skipValidateSpec`
- **Type:** `boolean`
- **Required:** No
- **Default:** `false`
- **Description:** Skip validation of the OpenAPI specification
- **Example:** `true`

### `strictSpec`
- **Type:** `boolean`
- **Required:** No
- **Default:** `false`
- **Description:** Use strict specification validation
- **Example:** `true`

## T

### `templateDirectory`
- **Type:** `string`
- **Required:** No
- **Description:** Directory containing custom templates for code generation
- **Example:** `"apps/my-app/templates"`

## Options by Category

### Required Options
- [`inputSpec`](#inputspec) - OpenAPI specification file or URL
- [`outputPath`](#outputpath) - Output directory for generated code

### Basic Configuration
- [`configFile`](#configfile) - Configuration file path
- [`skipValidateSpec`](#skipvalidatespec) - Skip spec validation

### Authentication
- [`auth`](#auth) - Authentication for remote specs

### Naming & Packages
- [`apiNameSuffix`](#apisamesuffix) - API class suffix
- [`apiPackage`](#apipackage) - API package name
- [`packageName`](#packagename) - Library package name
- [`modelNamePrefix`](#modelnameprefix) - Model class prefix
- [`modelNameSuffix`](#modelnamesuffix) - Model class suffix
- [`modelPackage`](#modelpackage) - Model package name

### Generation Behavior
- [`dryRun`](#dryrun) - Dry run mode
- [`enablePostProcessFile`](#enablepostprocessfile) - Enable post-processing
- [`minimalUpdate`](#minimalupdate) - Minimal file updates
- [`skipOverwrite`](#skipoverwrite) - Skip file overwrites
- [`removeOperationIdPrefix`](#removeoperationidprefix) - Remove operation prefixes
- [`skipOperationExample`](#skipoperationexample) - Skip operation examples
- [`strictSpec`](#strictspec) - Strict validation

### Templates & Customization
- [`templateDirectory`](#templatedirectory) - Custom templates directory
- [`ignoreFileOverride`](#ignorefileoverride) - Custom ignore file
- [`globalProperties`](#globalproperties) - Global generator properties

### Project Metadata
- [`artifactId`](#artifactid) - Artifact identifier
- [`artifactVersion`](#artifactversion) - Artifact version
- [`groupId`](#groupid) - Group identifier

### Git Integration
- [`gitHost`](#githost) - Git host
- [`gitUserId`](#gituserid) - Git user
- [`gitRepoId`](#gitrepoid) - Git repository

### Advanced
- [`httpUserAgent`](#httpuseragent) - Custom user agent
- [`releaseNote`](#releasenote) - Release notes
- [`inputSpecRootDirectory`](#inputspecrootdirectory) - Spec root directory
- [`invokerPackage`](#invokerpackage) - Invoker package name
- [`logToStderr`](#logtostderr) - Log to stderr

## Usage in Configuration

### Basic Usage
```json
{
  "inputSpec": "swagger.json",
  "outputPath": "libs/api/src"
}
```

### Advanced Usage
```json
{
  "inputSpec": "https://api.example.com/swagger.json",
  "outputPath": "libs/api-client/src",
  "configFile": "openapi-config.json",
  "packageName": "@my-org/api-client",
  "apiNameSuffix": "Service",
  "skipValidateSpec": true,
  "globalProperties": {
    "supportsES6": "true",
    "providedInRoot": "true"
  }
}
```

### Environment-Specific
```json
{
  "configurations": {
    "development": {
      "inputSpec": "http://localhost:3000/api/swagger.json",
      "skipValidateSpec": true,
      "dryRun": false
    },
    "production": {
      "inputSpec": "https://api.prod.com/swagger.json",
      "strictSpec": true,
      "skipValidateSpec": false
    }
  }
}
```

## Common Combinations

### Fast Development
```json
{
  "skipValidateSpec": true,
  "minimalUpdate": true,
  "skipOperationExample": true
}
```

### Production Ready
```json
{
  "strictSpec": true,
  "skipValidateSpec": false,
  "enablePostProcessFile": true
}
```

### Custom Branding
```json
{
  "packageName": "@my-org/api-client",
  "apiNameSuffix": "Service",
  "modelNamePrefix": "Api",
  "modelNameSuffix": "DTO"
}
```