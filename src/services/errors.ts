/**
 * Structured application error with a user-facing message and optional cause.
 */
export class AppError extends Error {
  /** Machine-readable code for programmatic handling. */
  readonly code: string;

  constructor(message: string, code: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AppError';
    this.code = code;
  }
}
