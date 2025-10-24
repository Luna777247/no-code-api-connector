export interface ApiRequest {
  url: string
  method: string
  headers?: Record<string, string>
  params?: Record<string, any>
  body?: any
  expectBinary?: boolean
}

export interface ExecutionResult {
  success: boolean
  statusCode?: number
  data?: any
  metadata?: Record<string, any>
  isBinary?: boolean
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
          const errorText = await response.text().catch(() => "")

          if (response.status === 429 && attempt < this.maxRetries) {
            const retryAfter = response.headers.get("Retry-After")
            const delay = retryAfter
              ? Number.parseInt(retryAfter) * 1000
              : Math.min(this.retryDelay * Math.pow(2, attempt + 1), 30000)
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }

          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ""}`)
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ""}`)
        }

        const contentType = response.headers.get("content-type") || ""
        const isBinary =
          contentType.toLowerCase().includes("image/") ||
          contentType.toLowerCase().includes("application/octet-stream") ||
          contentType.toLowerCase().includes("application/pdf")

        let data: any
        let metadata: Record<string, any> | undefined

        if (isBinary) {
          const contentLength = response.headers.get("content-length")
          const lastModified = response.headers.get("last-modified")

          metadata = {
            contentType,
            contentLength: contentLength ? Number.parseInt(contentLength) : undefined,
            lastModified,
            url: request.url,
            params: request.params,
            isBinary: true,
            responseHeaders: Object.fromEntries(response.headers.entries()),
          }

          data = metadata
        } else {
          data = await response.json()
        }

        return {
          success: true,
          statusCode: response.status,
          data,
          metadata,
          isBinary,
          responseTime,
        }
      } catch (error) {
        lastError = error as Error

        if (attempt < this.maxRetries) {
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
    return Promise.all(requests.map((req) => this.execute(req)))
  }
}
