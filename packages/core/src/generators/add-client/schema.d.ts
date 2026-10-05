export interface AddClientGeneratorSchema {
  name: string;
  directory: string;
  scope?: string;
  /** Local path (workspace-relative) or URL */
  spec: string;
  adapter?: 'openapi-tools' | 'hey-api';
  generatorOptions?: Record<string, unknown>;
  split?: boolean;
  importPrefix?: string;
  addToGitignore?: boolean;
  skipFormat?: boolean;
}
