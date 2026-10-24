export type AppErrorCode = "NOT_FOUND" | "FORBIDDEN" | "VALIDATION" | "CONFLICT";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
