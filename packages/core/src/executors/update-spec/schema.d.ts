export type UpdateSpecFormat = 'raw' | 'json';

export interface CoreUpdateSpecExecutorSchema {
  /** Remote spec URL (single spec) */
  url?: string;
  /** Map of name -> remote spec URL (multiple specs) */
  urls?: Record<string, string>;
  /** Target file (single spec) or target directory (multiple specs) */
  specPath?: string;
  /** Map of name -> target file (multiple specs) */
  specPaths?: Record<string, string>;
  /** Request headers; supports ${ENV_VAR} substitution */
  headers?: Record<string, string>;
  /** Do not write; fail if remote differs from the committed file */
  check?: boolean;
  /** 'raw' keeps the response as fetched, 'json' pretty-prints JSON with 2 spaces */
  format?: UpdateSpecFormat;
}
