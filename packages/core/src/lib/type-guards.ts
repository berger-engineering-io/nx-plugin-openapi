import { GeneratorPlugin, GenerateOptionsBase, InputSpec } from './interfaces';

export function isGeneratorPlugin(obj: unknown): obj is GeneratorPlugin {
  return (
    !!obj &&
    typeof obj === 'object' &&
    'name' in obj &&
    typeof (obj as GeneratorPlugin).name === 'string' &&
    'generate' in obj &&
    typeof (obj as GeneratorPlugin).generate === 'function'
  );
}

export function isValidInputSpec(spec: unknown): spec is InputSpec {
  if (typeof spec === 'string') {
    return spec.length > 0;
  }
  
  if (spec && typeof spec === 'object' && !Array.isArray(spec)) {
    const entries = Object.entries(spec);
    return (
      entries.length > 0 &&
      entries.every(([key, value]) => 
        typeof key === 'string' && 
        typeof value === 'string' &&
        key.length > 0 &&
        value.length > 0
      )
    );
  }
  
  return false;
}

export function isValidGenerateOptions(options: unknown): options is GenerateOptionsBase {
  if (!options || typeof options !== 'object') {
    return false;
  }
  
  const opts = options as Record<string, unknown>;
  
  return (
    'inputSpec' in opts &&
    isValidInputSpec(opts['inputSpec']) &&
    'outputPath' in opts &&
    typeof opts['outputPath'] === 'string' &&
    opts['outputPath'].length > 0 &&
    (opts['generatorOptions'] === undefined || 
     (typeof opts['generatorOptions'] === 'object' && 
      opts['generatorOptions'] !== null &&
      !Array.isArray(opts['generatorOptions'])))
  );
}

export function assertValidPath(path: string, fieldName: string): void {
  if (!path || typeof path !== 'string') {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  
  const trimmedPath = path.trim();
  
  if (trimmedPath === '') {
    throw new Error(`${fieldName} cannot be empty`);
  }
  
  if (trimmedPath === '/' || trimmedPath === '.' || trimmedPath === '..') {
    throw new Error(`${fieldName} cannot be a root or parent directory reference`);
  }
  
  const dangerousPatterns = [
    /^\//,  // Absolute paths starting with /
    /\.\./,  // Parent directory references
    /~\//,   // Home directory references
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmedPath)) {
      throw new Error(`${fieldName} contains potentially dangerous path pattern: ${pattern}`);
    }
  }
}