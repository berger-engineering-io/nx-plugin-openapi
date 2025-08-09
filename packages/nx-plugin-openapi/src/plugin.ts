import {
  CreateNodesContext,
  CreateNodesV2,
  createNodesFromFiles,
  TargetConfiguration,
  logger,
} from '@nx/devkit';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

export interface OpenApiPluginOptions {
  targetName?: string;
  specFilePatterns?: string[];
  outputPathPattern?: string;
  generatorDefaults?: Record<string, unknown>;
}

// Default file patterns for detecting OpenAPI specification files
const defaultSpecFilePatterns = [
  '**/*.openapi.json',
  '**/*.openapi.yaml', 
  '**/*.openapi.yml',
  '**/openapi.json',
  '**/openapi.yaml',
  '**/openapi.yml',
];

// Default glob pattern for common OpenAPI file patterns
const defaultOpenApiConfigGlob = '**/*{openapi,.openapi,api-spec,-spec,swagger}.{json,yaml,yml}';

export const createNodesV2: CreateNodesV2<OpenApiPluginOptions> = [
  defaultOpenApiConfigGlob,
  async (configFiles, options, context) => {
    return await createNodesFromFiles(
      (configFile, options, context) => {
        return createNodesInternal(configFile, options, context);
      },
      configFiles,
      options,
      context
    );
  },
];

function createNodesInternal(
  specFile: string,
  options: OpenApiPluginOptions | undefined,
  context: CreateNodesContext
) {
  const projectRoot = dirname(specFile);

  // Skip if this is in node_modules
  if (specFile.includes('node_modules')) {
    return {};
  }

  // Check if file matches user-specified patterns (if provided)
  if (options?.specFilePatterns) {
    const specFilePatterns = options.specFilePatterns;
    const fileMatches = specFilePatterns.some(pattern => {
      // Convert glob pattern to regex for matching
      const regex = new RegExp(
        '^' + pattern
          .replace(/\./g, '\\.')
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\{([^}]+)\}/g, '($1)')
          .replace(/,/g, '|') + '$'
      );
      return regex.test(specFile);
    });
    
    if (!fileMatches) {
      return {};
    }
  }

  // Validate that this is actually an OpenAPI spec
  if (!isOpenApiSpec(join(context.workspaceRoot, specFile))) {
    return {};
  }

  const targetName = options?.targetName ?? 'generate-api';
  const outputPathPattern = options?.outputPathPattern ?? 'src/generated/{serviceName}';
  
  // Extract service name from file name
  const serviceName = extractServiceName(specFile);
  const outputPath = outputPathPattern.replace('{serviceName}', serviceName);

  const targets: Record<string, TargetConfiguration> = {
    [targetName]: {
      executor: '@lambda-solutions/nx-plugin-openapi:generate-api',
      cache: true,
      inputs: [
        'default',
        '{projectRoot}/**/*.openapi.*',
        '{projectRoot}/**/openapi.*',
        '{projectRoot}/**/*-spec.*',
        '{projectRoot}/**/*api-spec.*',
        '{projectRoot}/**/swagger.*',
      ],
      outputs: ['{options.outputPath}'],
      options: {
        inputSpec: specFile,
        outputPath: join(projectRoot, outputPath),
        ...options?.generatorDefaults,
      },
    },
  };

  return {
    projects: {
      [projectRoot]: {
        targets,
      },
    },
  };
}

function isOpenApiSpec(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // Try to parse as JSON first
    if (filePath.endsWith('.json')) {
      const spec = JSON.parse(content) as { openapi?: string; swagger?: string };
      // Check for OpenAPI 3.x or Swagger 2.0
      return !!(spec.openapi?.startsWith('3.') || spec.swagger === '2.0');
    } else {
      // For YAML files, we'll do a simple check for now
      // In a real implementation, you'd use a YAML parser
      return content.includes('openapi:') || content.includes('swagger:');
    }
  } catch {
    return false;
  }
}

function extractServiceName(specFile: string): string {
  const fileName = specFile.split('/').pop() || '';
  
  // Remove extensions
  let serviceName = fileName
    .replace(/\.openapi\.(json|yaml|yml)$/, '')
    .replace(/\.(json|yaml|yml)$/, '');
  
  // If the file is just named 'openapi', use the parent directory name
  if (serviceName === 'openapi' || serviceName === '') {
    const parts = specFile.split('/');
    serviceName = parts[parts.length - 2] || 'api';
  }
  
  return serviceName;
}

/**
 * @deprecated Use createNodesV2 instead
 */
export const createNodes = [
  defaultOpenApiConfigGlob,
  (configFile: string, options: OpenApiPluginOptions | undefined, context: CreateNodesContext) => {
    logger.warn('`createNodes` is deprecated. Update your plugin to utilize createNodesV2 instead. In Nx 20, this will change to the createNodesV2 API.');
    return createNodesInternal(configFile, options, context);
  },
];