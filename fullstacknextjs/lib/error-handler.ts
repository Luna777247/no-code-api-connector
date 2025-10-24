export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code = "INTERNAL_ERROR",
  ) {
    super(message)
    this.name = "AppError"
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, "VALIDATION_ERROR")
    this.name = "ValidationError"
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, "NOT_FOUND")
    this.name = "NotFoundError"
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED")
    this.name = "UnauthorizedError"
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "CONFLICT")
    this.name = "ConflictError"
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(429, "Too many requests", "RATE_LIMIT")
    this.name = "RateLimitError"
  }
}

export interface ErrorResponse {
  error: string
  code: string
  statusCode: number
  details?: Record<string, unknown>
  timestamp: string
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown, details?: Record<string, unknown>): ErrorResponse {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details,
      timestamp: new Date().toISOString(),
    }
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      code: "INTERNAL_ERROR",
      statusCode: 500,
      details,
      timestamp: new Date().toISOString(),
    }
  }

  return {
    error: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
    statusCode: 500,
    details,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch (error) {
    console.error("[v0] JSON parse error:", error)
    return fallback
  }
}

/**
 * Retry logic for failed operations
 */
export async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, delayMs = 1000): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        const delay = delayMs * Math.pow(2, attempt - 1) // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error("Operation failed after retries")
}
