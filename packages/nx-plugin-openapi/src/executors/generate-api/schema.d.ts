export interface GenerateApiExecutorSchema {
  inputSpec: string;
  outputPath: string;
  configFile?: string;
  skipValidateSpec?: boolean;
}
