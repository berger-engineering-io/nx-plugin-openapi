import { InputSpec } from '../../lib/interfaces';

export interface CoreGenerateApiExecutorSchema {
  generator?: string; // default: 'openapi-tools'
  inputSpec: InputSpec;
  outputPath: string;
  generatorOptions?: Record<string, unknown>;
}
