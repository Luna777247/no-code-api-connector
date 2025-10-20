// API Executor - Handles API request execution with retry logic
export interface ApiRequest {
  url: string
  method: string
  headers?: Record<string, string>
  params?: Record<string, any>
  body?: any
}

export interface ExecutionResult {
  success: boolean
  statusCode?: number
  data?: any
  error?: string
  responseTime: number
}

export class ApiExecutor {
  private maxRetries: number
  private retryDelay: number

  constructor(maxRetries = 3, retryDelay = 1000) {
    this.maxRetries = maxRetries
    this.retryDelay = retryDelay
  }

  async execute(request: ApiRequest): Promise<ExecutionResult> {
    const startTime = Date.now()
    let lastError: Error | null = null

    // Build URL with query parameters
    let url = request.url
    if (request.params && Object.keys(request.params).length > 0) {
      const urlObj = new URL(url)
      Object.entries(request.params).forEach(([key, value]) => {
        urlObj.searchParams.append(key, String(value))
      })
      url = urlObj.toString()
    }

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[v0] Executing API request (attempt ${attempt + 1}/${this.maxRetries + 1}):`, url)

        const response = await fetch(url, {
          method: request.method,
          headers: {
            "Content-Type": "application/json",
            ...request.headers,
          },
          body: request.body ? JSON.stringify(request.body) : undefined,
        })

        const responseTime = Date.now() - startTime

        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          
          // For rate limiting (429), use longer delay before retry
          if (response.status === 429 && attempt < this.maxRetries) {
            const retryAfter = response.headers.get('Retry-After')
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(this.retryDelay * Math.pow(2, attempt + 1), 30000) // Exponential backoff, max 30s
            console.log(`[v0] Rate limited (429), retrying in ${delay}ms...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue // Skip the throw and retry
          }
          
          // For client errors (4xx) except 429, don't retry
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            console.log(`[v0] Client error ${response.status}, not retrying`)
          }
          
          throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`)
        }

        const data = await response.json()

        console.log(`[v0] API request successful in ${responseTime}ms`)

        return {
          success: true,
          statusCode: response.status,
          data,
          responseTime,
        }
      } catch (error) {
        lastError = error as Error
        console.error(`[v0] API request failed (attempt ${attempt + 1}):`, error)

        if (attempt < this.maxRetries) {
          console.log(`[v0] Retrying in ${this.retryDelay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay))
        }
      }
    }

    const responseTime = Date.now() - startTime
    return {
      success: false,
      error: lastError?.message || "Unknown error",
      responseTime,
    }
  }

  async executeBatch(requests: ApiRequest[]): Promise<ExecutionResult[]> {
    console.log(`[v0] Executing batch of ${requests.length} requests`)
    const results = await Promise.all(requests.map((req) => this.execute(req)))
    console.log(
      `[v0] Batch execution completed: ${results.filter((r) => r.success).length}/${results.length} successful`,
    )
    return results
  }
}
