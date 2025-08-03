import {
  CreateNodesContext,
  CreateNodesV2,
  createNodesFromFiles,
  TargetConfiguration,
  logger,
} from '@nx/devkit';
import { dirname, join, relative } from 'path';
import { existsSync, readFileSync } from 'fs';

export interface OpenApiPluginOptions {
  targetName?: string;
  specFilePatterns?: string[];
  outputPathPattern?: string;
  generatorDefaults?: Record<string, any>;
}

const defaultSpecFilePatterns = [
  '**/*.openapi.json',
  '**/*.openapi.yaml',
  '**/*.openapi.yml',
  '**/openapi.json',
  '**/openapi.yaml',
  '**/openapi.yml',
];

export const createNodesV2: CreateNodesV2<OpenApiPluginOptions> = [
  (configFiles, options, context) => {
    const specFilePatterns = options?.specFilePatterns || defaultSpecFilePatterns;
    return createNodesFromFiles(
      (configFile, options, context) => {
        return createNodesInternal(configFile, options, context);
      },
      specFilePatterns,
      options,
      context
    );
  },
  {
    projectFilePatterns: defaultSpecFilePatterns,
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
    let spec: any;
    if (filePath.endsWith('.json')) {
      spec = JSON.parse(content);
    } else {
      // For YAML files, we'll do a simple check for now
      // In a real implementation, you'd use a YAML parser
      return content.includes('openapi:') || content.includes('swagger:');
    }

    // Check for OpenAPI 3.x or Swagger 2.0
    return !!(spec.openapi?.startsWith('3.') || spec.swagger === '2.0');
  } catch (e) {
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
export const createNodes = createNodesV2[0];