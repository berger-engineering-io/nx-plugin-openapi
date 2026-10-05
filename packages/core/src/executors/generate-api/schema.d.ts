import { InputSpec, PostProcessStep } from '../../lib/interfaces';

export interface CoreGenerateApiExecutorSchema {
  generator?: string; // default: 'openapi-tools'
  inputSpec: InputSpec;
  outputPath: string;
  generatorOptions?: Record<string, unknown>;
  // Run in order after a successful generation
  postProcess?: PostProcessStep[];
}
