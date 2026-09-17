export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = "AppError";
  }
}
