# Plugin System Demo Configuration

This document demonstrates how to use the new plugin system with the core abstraction layer and OpenAPI plugin.

## Using the Plugin System

The new plugin system provides a flexible architecture for code generation from OpenAPI specifications.

### Core Plugin with OpenAPI Tools Generator

```typescript
import { GeneratorRegistry } from '@nx-plugin-openapi/core';
import { OpenAPIToolsGenerator } from '@nx-plugin-openapi/plugin-openapi';

// Register the plugin
const registry = GeneratorRegistry.getInstance();
const openAPIPlugin = new OpenAPIToolsGenerator();
registry.register(openAPIPlugin);

// Use the plugin
const result = await openAPIPlugin.generate({
  inputSpec: 'apps/demo/swagger.json',
  outputPath: 'apps/demo/src/app/api-generated',
  generator: 'typescript-angular',
  skipValidateSpec: true
}, context);
```

### Configuration in project.json

Once the executor is updated to use the plugin system, you can configure it like this:

```json
{
  "generate-api-with-plugin": {
    "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
    "options": {
      "inputSpec": "apps/demo/swagger.json",
      "outputPath": "apps/demo/src/app/api-plugin",
      "generator": "openapi-tools",
      "autoInstall": false,
      "generatorOptions": {
        "generatorType": "typescript-angular"
      }
    }
  }
}
```

### Multiple Specs Support

The plugin system also supports generating from multiple OpenAPI specifications:

```json
{
  "generate-api-multiple-with-plugin": {
    "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
    "options": {
      "inputSpec": {
        "user-service": "apps/demo/apis/user-service.json",
        "product-service": "apps/demo/apis/product-service.json"
      },
      "outputPath": "apps/demo/src/app/api-services-plugin",
      "generator": "openapi-tools",
      "generatorOptions": {
        "generatorType": "typescript-angular"
      }
    }
  }
}
```

## Available Plugins

- **openapi-tools**: The default OpenAPI Generator CLI plugin (bundled)
  - Supports 50+ generator types
  - Full customization options
  - Template support

## Future Plugins

The architecture supports adding additional plugins:
- Orval
- OpenAPI TypeScript
- Custom enterprise generators

## Benefits

1. **Extensibility**: Easy to add new generators
2. **Type Safety**: Full TypeScript support
3. **Auto-Installation**: Plugins can be auto-installed when needed
4. **Validation**: Schema-based validation for all options
5. **Consistency**: Shared base functionality across all generators