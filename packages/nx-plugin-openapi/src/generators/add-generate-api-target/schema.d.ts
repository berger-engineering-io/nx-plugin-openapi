export interface AddGenerateApiSchema {
  project: string;
  inputSpec: string;
  generatorType?: string;
  outputPath: string;
  configFile?: string;
  skipValidateSpec?: boolean;
  addToGitignore?: boolean;
  targetName?: string;
}
