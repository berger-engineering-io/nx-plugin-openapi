# @lambda-solutions/nx-openapi-plugin-openapi-tools

OpenAPI Generator CLI plugin for `@lambda-solutions/nx-plugin-openapi`.

## Overview

This plugin provides full support for the OpenAPI Generator CLI, offering code generation for 50+ languages and frameworks.

## Installation

This plugin is automatically installed when you use it with `@lambda-solutions/nx-plugin-openapi`. You can also install it manually:

```bash
npm install --save-dev @lambda-solutions/nx-openapi-plugin-openapi-tools
```

## Supported Generators

This plugin supports all generators available in the OpenAPI Generator CLI, including:

### TypeScript/JavaScript
- `typescript-angular` - Angular services
- `typescript-axios` - Axios-based API client
- `typescript-fetch` - Fetch API client
- `typescript-node` - Node.js API client
- `typescript-rxjs` - RxJS-based API client
- `javascript` - JavaScript client

### Backend Languages
- `java` - Java client
- `python` - Python client
- `python-fastapi` - FastAPI server
- `python-flask` - Flask server
- `go` - Go client
- `rust` - Rust client
- `csharp` - C# client
- `ruby` - Ruby client
- `php` - PHP client

### And many more...

## Usage

Configure your project to use this generator:

```json
{
  "targets": {
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "options": {
        "inputSpec": "api/openapi.json",
        "outputPath": "libs/api-client/src",
        "generator": "openapi-tools",
        "generatorType": "typescript-angular",
        "additionalProperties": {
          "ngVersion": "16.0.0",
          "providedIn": "root"
        }
      }
    }
  }
}
```

## Configuration Options

All OpenAPI Generator CLI options are supported through the configuration. Common options include:

- `generatorType` - The specific generator to use
- `configFile` - Path to configuration file
- `templateDirectory` - Path to custom templates
- `additionalProperties` - Generator-specific properties
- `globalProperties` - Global properties for generation

## Custom Templates

You can use custom templates by specifying the `templateDirectory` option:

```json
{
  "options": {
    "templateDirectory": "templates/custom-angular"
  }
}
```

## License

MIT