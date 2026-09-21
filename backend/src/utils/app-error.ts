export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code = "INTERNAL_ERROR",
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}
