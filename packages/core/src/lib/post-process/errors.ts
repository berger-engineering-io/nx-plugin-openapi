import { CoreError } from '../errors';

export class PostProcessorNotFoundError extends CoreError {
  constructor(public postProcessorName: string) {
    super(`Post-processor not found: ${postProcessorName}`);
  }
}

export class PostProcessorLoadError extends CoreError {
  constructor(public postProcessorName: string, cause?: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    super(
      `Failed to load post-processor: ${postProcessorName}. Reason: ${causeMessage}`,
      cause
    );
  }
}

export class PostProcessError extends CoreError {
  constructor(public postProcessorName: string, cause?: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    super(
      `Post-processor '${postProcessorName}' failed. Reason: ${causeMessage}`,
      cause
    );
  }
}
