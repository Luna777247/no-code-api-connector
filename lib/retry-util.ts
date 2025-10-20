export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  backoffFactor?: number
  retryCondition?: (error: Error) => boolean
}

export class RetryUtil {
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffFactor = 2,
      retryCondition = () => true
    } = options

    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Don't retry if we've exhausted attempts or condition fails
        if (attempt > maxRetries || !retryCondition(lastError)) {
          throw lastError
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay)

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay * (0.5 + Math.random() * 0.5)

        console.log(`[RetryUtil] Attempt ${attempt} failed, retrying in ${Math.round(jitteredDelay)}ms:`, lastError.message)

        await new Promise(resolve => setTimeout(resolve, jitteredDelay))
      }
    }

    throw lastError!
  }

  // Specific retry conditions for different types of operations
  static isRetryableApiError(error: Error): boolean {
    // Retry on network errors, timeouts, 5xx errors
    const message = error.message.toLowerCase()
    return message.includes('timeout') ||
           message.includes('network') ||
           message.includes('connection') ||
           message.includes('econnreset') ||
           message.includes('enotfound') ||
           message.includes('500') ||
           message.includes('502') ||
           message.includes('503') ||
           message.includes('504')
  }

  static isRetryableDatabaseError(error: Error): boolean {
    // Retry on connection errors, temporary unavailability
    const message = error.message.toLowerCase()
    return message.includes('connection') ||
           message.includes('timeout') ||
           message.includes('temporarily') ||
           message.includes('unavailable') ||
           message.includes('econnreset')
  }

  static isRetryableFileError(error: Error): boolean {
    // Retry on temporary file system errors
    const message = error.message.toLowerCase()
    return message.includes('busy') ||
           message.includes('locked') ||
           message.includes('temporarily') ||
           message.includes('eagain')
  }
}