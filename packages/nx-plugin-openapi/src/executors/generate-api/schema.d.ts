export type GeneratorType = 'typescript-angular';

export interface GenerateApiExecutorSchema {
  specPath: string;
  generatorType?: string;
  outputPath: string;
  configFile?: string;
  skipValidateSpec?: boolean;
} // eslint-disable-line
