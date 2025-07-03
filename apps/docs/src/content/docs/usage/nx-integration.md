---
title: Nx Integration
description: Learn how to integrate the generate-api executor with Nx's build system and caching
---

# Nx Integration

The Nx Plugin OpenAPI is designed to work seamlessly with Nx's build system, caching, and dependency graph. This page explains how to set up advanced integration patterns.

## Target Dependencies

### Basic Dependency Setup

Make your build process depend on API generation:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "options": {
        "inputSpec": "apps/my-app/swagger.json",
        "outputPath": "libs/api-client/src"
      }
    },
    "build": {
      "dependsOn": ["generate-api"]
    }
  }
}
```

### Cross-Project Dependencies

Set up dependencies between projects:

```json title="apps/frontend/project.json"
{
  "targets": {
    "build": {
      "dependsOn": ["^generate-api", "generate-api"]
    }
  }
}
```

This ensures that:
- `^generate-api` - All dependencies' `generate-api` targets run first
- `generate-api` - This project's `generate-api` target runs

## Workspace-Level Configuration

### Target Defaults

Configure default behavior for all `generate-api` targets in your workspace:

```json title="nx.json"
{
  "targetDefaults": {
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "cache": true,
      "inputs": [
        "{projectRoot}/swagger.json",
        "{projectRoot}/openapi.json",
        "{projectRoot}/api-spec.yaml",
        "{projectRoot}/openapi-config.json",
        "{projectRoot}/openapitools.json"
      ],
      "outputs": ["{options.outputPath}"]
    },
    "build": {
      "dependsOn": ["^build", "^generate-api", "generate-api"]
    },
    "test": {
      "dependsOn": ["generate-api"]
    }
  }
}
```

## Caching Configuration

### Input Files for Cache Invalidation

Specify which files should trigger cache invalidation:

```json title="nx.json"
{
  "targetDefaults": {
    "generate-api": {
      "cache": true,
      "inputs": [
        "{projectRoot}/swagger.json",
        "{projectRoot}/openapi.json",
        "{projectRoot}/api-spec.yaml",
        "{projectRoot}/openapi-config.json",
        "{projectRoot}/openapitools.json",
        "{projectRoot}/.openapi-generator-ignore",
        "{projectRoot}/templates/**/*"
      ]
    }
  }
}
```

### Remote URL Caching

For remote OpenAPI specifications, the executor automatically handles caching based on content:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "options": {
        "inputSpec": "https://api.example.com/swagger.json",
        "outputPath": "libs/api-client/src"
      }
    }
  }
}
```

The cache key includes the remote URL content, so:
- ✅ Same content = cache hit
- ✅ Changed content = cache miss and regeneration
- ⚠️ Remote fetch happens on every run to check for changes

### Output Configuration

Specify outputs for proper caching:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "options": {
        "inputSpec": "apps/my-app/swagger.json",
        "outputPath": "libs/api-client/src"
      },
      "outputs": [
        "{options.outputPath}",
        "libs/api-client/src"
      ]
    }
  }
}
```

## Affected Commands

### Run Generation for Affected Projects

Generate API clients only for projects affected by changes:

```bash
# Generate APIs for affected projects
nx affected --target=generate-api

# Build affected projects (will generate APIs first due to dependencies)
nx affected --target=build
```

### Include API Specs in Affected Analysis

Make sure OpenAPI specification changes trigger affected analysis:

```json title="nx.json"
{
  "implicitDependencies": {
    "shared-api-spec.json": ["user-service", "product-service"],
    "common-types.yaml": "*"
  }
}
```

## Project Graph Integration

### Visualize Dependencies

View how API generation fits into your project graph:

```bash
nx graph
```

This will show:
- Which projects depend on generated API clients
- How API generation targets relate to build targets
- The overall dependency flow

### Implicit Dependencies

Create implicit dependencies for shared API specifications:

```json title="nx.json"
{
  "implicitDependencies": {
    "shared/api-specs/user-api.json": ["frontend", "mobile-app"],
    "shared/api-specs/common.yaml": "*"
  }
}
```

## Advanced Patterns

### Multi-Stage Generation

Set up complex generation pipelines:

```json title="project.json"
{
  "targets": {
    "generate-types": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "options": {
        "inputSpec": "shared/specs/types.yaml",
        "outputPath": "libs/shared-types/src"
      }
    },
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "dependsOn": ["generate-types"],
      "options": {
        "inputSpec": "apps/my-app/swagger.json",
        "outputPath": "libs/api-client/src"
      }
    },
    "build": {
      "dependsOn": ["generate-api"]
    }
  }
}
```

### Parallel Generation

Generate multiple API clients in parallel:

```json title="nx.json"
{
  "targetDefaults": {
    "generate-user-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api"
    },
    "generate-product-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api"
    },
    "generate-all-apis": {
      "executor": "nx:run-commands",
      "options": {
        "commands": [
          "nx run my-app:generate-user-api",
          "nx run my-app:generate-product-api"
        ],
        "parallel": true
      }
    }
  }
}
```

### Conditional Generation

Use environment variables for conditional generation:

```json title="project.json"
{
  "targets": {
    "generate-api": {
      "executor": "@lambda-solutions/nx-plugin-openapi:generate-api",
      "options": {
        "inputSpec": "apps/my-app/swagger.json",
        "outputPath": "libs/api-client/src"
      },
      "configurations": {
        "development": {
          "inputSpec": "http://localhost:3000/api/swagger.json"
        },
        "production": {
          "inputSpec": "https://api.prod.example.com/swagger.json"
        }
      }
    }
  }
}
```

## Performance Optimization

### Cache Strategy

Optimize caching for large monorepos:

```json title="nx.json"
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["generate-api", "build", "test"],
        "parallel": 3
      }
    }
  },
  "targetDefaults": {
    "generate-api": {
      "cache": true,
      "inputs": [
        "{projectRoot}/swagger.json",
        "{projectRoot}/openapi-config.json"
      ],
      "outputs": ["{options.outputPath}"]
    }
  }
}
```

### Distributed Caching

Use Nx Cloud for distributed caching:

```bash
# Connect to Nx Cloud
nx connect

# All generate-api tasks will be cached in the cloud
nx run-many --target=generate-api --all
```

## CI/CD Integration

### GitHub Actions

```yaml title=".github/workflows/ci.yml"
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Needed for Nx affected commands
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      
      # Set up Nx Cloud (optional)
      - run: npx nx-cloud start-ci-run
      
      # Generate APIs for affected projects
      - name: Generate API Clients
        run: npx nx affected --target=generate-api --parallel=3
      
      # Build affected projects
      - name: Build
        run: npx nx affected --target=build --parallel=3
      
      # Test affected projects
      - name: Test
        run: npx nx affected --target=test --parallel=3
```

### Jenkins Pipeline

```groovy title="Jenkinsfile"
pipeline {
    agent any
    
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Generate APIs') {
            steps {
                sh 'npx nx affected --target=generate-api --base=origin/main'
            }
        }
        
        stage('Build') {
            steps {
                sh 'npx nx affected --target=build --base=origin/main'
            }
        }
        
        stage('Test') {
            steps {
                sh 'npx nx affected --target=test --base=origin/main'
            }
        }
    }
    
    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'coverage',
                reportFiles: 'index.html',
                reportName: 'Coverage Report'
            ])
        }
    }
}
```

## Troubleshooting

### Cache Issues

If you're experiencing cache issues:

```bash
# Clear cache
nx reset

# Run with verbose output
nx run my-app:generate-api --verbose

# Skip cache for debugging
nx run my-app:generate-api --skip-nx-cache
```

### Dependency Issues

Check project dependencies:

```bash
# View project graph
nx graph

# Show project details
nx show project my-app

# List all tasks
nx run-many --target=generate-api --dry-run
```

## Next Steps

- [View Examples](/usage/examples/) for practical implementation patterns
- [API Reference](/reference/generate-api/) for complete executor documentation
- [Configuration Guide](/usage/configuration/) for detailed option explanations