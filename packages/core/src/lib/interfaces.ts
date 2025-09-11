export type InputSpec = string | Record<string, string>;

export interface GenerateOptionsBase {
  inputSpec: InputSpec;
  outputPath: string;
  // Arbitrary plugin-specific options
  generatorOptions?: Record<string, unknown>;
}

export interface GeneratorContext {
  root: string;
  workspaceName?: string;
}

export interface GeneratorResult {
  success: boolean;
  message?: string;
}

export interface GeneratorPlugin<TOptions = Record<string, unknown>> {
  readonly name: string;
  validate?(options: TOptions & GenerateOptionsBase): void | Promise<void>;
  generate(
    options: TOptions & GenerateOptionsBase,
    ctx: GeneratorContext
  ): Promise<GeneratorResult | void>;
  getSchema?(): unknown;
}
