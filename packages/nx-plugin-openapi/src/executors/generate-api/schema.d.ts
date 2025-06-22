export type GeneratorType = 'typescript-angular';

export interface GenerateApiExecutorSchema {
  inputSpec: string;
  generatorType?: string;
  outputPath: string;
  configFile?: string;
  skipValidateSpec?: boolean;
  pluginMetadataDir?: string;
} // eslint-disable-line
