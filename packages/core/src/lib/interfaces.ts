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

export interface GeneratorPlugin<TOptions = Record<string, unknown>>
  extends GeneratorPluginPostProcessHooks {
  readonly name: string;
  validate?(options: TOptions & GenerateOptionsBase): void | Promise<void>;
  generate(
    options: TOptions & GenerateOptionsBase,
    ctx: GeneratorContext
  ): Promise<GeneratorResult | void>;
  getSchema?(): unknown;
}

/**
 * Category of a generated file. Used by post-processors (e.g. a "split"
 * post-processor) to decide where a file belongs.
 *
 * - `model`: data types / DTOs
 * - `api`: services / operations calling the HTTP API
 * - `core`: runtime/support code shared by apis (http client, config, utils)
 * - `other`: anything else (docs, metadata, ...)
 */
export type GeneratedFileKind = 'model' | 'api' | 'core' | 'other';

/**
 * Result of {@link GeneratorPlugin.classify}.
 */
export interface FileClassification {
  /**
   * Generated files keyed by path relative to the classified output dir
   * (POSIX separators), mapped to their {@link GeneratedFileKind}.
   */
  files: Record<string, GeneratedFileKind>;
}

/**
 * A single generated file handed to {@link GeneratorPlugin.transform}.
 */
export interface GeneratedFile {
  /** Path relative to the output dir (POSIX separators). */
  path: string;
  /** Current file content. */
  content: string;
  /** Kind of the file, if it was classified before. */
  kind?: GeneratedFileKind;
}

/**
 * Optional plugin hooks consumed by post-processors. Generators that do not
 * implement them simply cannot be used with post-processors relying on them.
 */
export interface GeneratorPluginPostProcessHooks {
  /**
   * Classify the files generated into `outDir` (absolute path).
   * `options` are the options of the calling post-processor.
   */
  classify?(
    outDir: string,
    options?: Record<string, unknown>
  ): Promise<FileClassification> | FileClassification;

  /**
   * Plugin-specific rewrite of a generated file, e.g. fixing imports after a
   * post-processor moved files around. Return the new content, or `undefined`
   * to keep the file unchanged.
   */
  transform?(
    file: GeneratedFile,
    options?: Record<string, unknown>
  ): Promise<string | undefined> | string | undefined;
}

/**
 * Context passed to a {@link PostProcessor}. Created by the `generate-api`
 * executor after a successful `generate()`.
 */
export interface PostProcessContext {
  /** Absolute workspace root. */
  root: string;
  /** Nx project running the executor, if any. */
  projectName?: string;
  /** Output path as relative to `root` (POSIX separators). */
  outputPath: string;
  /** Absolute output path. */
  absoluteOutputPath: string;
  /** Input spec(s) as configured. */
  inputSpec: InputSpec;
  /** Name of the generator used (e.g. `openapi-tools`). */
  generatorName: string;
  /** Generator plugin instance, gives access to `classify` / `transform`. */
  generator: GeneratorPlugin;
  /** Generator options as configured. */
  generatorOptions?: Record<string, unknown>;
}

/**
 * Step run after generation. Resolved by name, either from the
 * post-processor registry or by importing a package with that name.
 */
export interface PostProcessor<TOptions = Record<string, unknown>> {
  readonly name: string;
  run(ctx: PostProcessContext, options: TOptions): Promise<void> | void;
}

/**
 * Entry of the executor `postProcess` option.
 */
export interface PostProcessStep {
  /** Registered post-processor name or package name. */
  name: string;
  /** Options passed to {@link PostProcessor.run}. */
  options?: Record<string, unknown>;
}
