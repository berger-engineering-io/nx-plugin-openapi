export interface AddGenerateApiSchema {
  project: string;
  inputSpec: string;
  outputPath: string;
  configFile?: string;
  skipValidateSpec?: boolean;
  addToGitignore?: boolean;
  targetName?: string;
}
