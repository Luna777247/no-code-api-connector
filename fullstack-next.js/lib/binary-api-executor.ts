// Custom API Executor for handling binary responses (like images)
export interface BinaryApiRequest {
  url: string
  method: string
  headers?: Record<string, string>
  params?: Record<string, any>
  body?: any
}

export interface BinaryExecutionResult {
  success: boolean
  statusCode?: number
  data?: any
  metadata?: Record<string, any>
  isBinary?: boolean
  error?: string
  responseTime: number
}

export class BinaryApiExecutor {
  private maxRetries: number
  private retryDelay: number

  constructor(maxRetries = 3, retryDelay = 1000) {
    this.maxRetries = maxRetries
    this.retryDelay = retryDelay
  }

  async execute(request: BinaryApiRequest): Promise<BinaryExecutionResult> {
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

    console.log(`[v0] Final URL being requested: ${url}`)

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[v0] Executing binary API request (attempt ${attempt + 1}/${this.maxRetries + 1}):`, url)

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
          throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`)
        }

        // Check if response is binary (image, file, etc.)
        const contentType = response.headers.get('content-type') || ''
        console.log(`[v0] Response content-type: ${contentType}`)
        const isBinary = contentType.toLowerCase().includes('image/') ||
                        contentType.toLowerCase().includes('application/octet-stream') ||
                        contentType.toLowerCase().includes('application/pdf')

        let data: any
        let metadata: Record<string, any> | undefined

        if (isBinary) {
          // For binary responses, don't try to parse as JSON
          // Instead, create metadata about the binary content
          const contentLength = response.headers.get('content-length')
          const lastModified = response.headers.get('last-modified')

          metadata = {
            contentType,
            contentLength: contentLength ? parseInt(contentLength) : undefined,
            lastModified,
            url: request.url,
            params: request.params,
            isBinary: true,
            responseHeaders: Object.fromEntries(response.headers.entries())
          }

          // For binary data, we store a reference or handle it separately
          // In a real implementation, you'd save the binary data to storage
          data = metadata

          console.log(`[v0] Binary response detected: ${contentType}, ${contentLength} bytes`)
        } else {
          // For JSON responses, parse normally
          data = await response.json()
          console.log(`[v0] JSON response parsed successfully`)
        }

        console.log(`[v0] API request successful in ${responseTime}ms`)

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

  async executeBatch(requests: BinaryApiRequest[]): Promise<BinaryExecutionResult[]> {
    console.log(`[v0] Executing batch of ${requests.length} binary requests`)
    const results = await Promise.all(requests.map((req) => this.execute(req)))
    console.log(
      `[v0] Batch execution completed: ${results.filter((r) => r.success).length}/${results.length} successful`,
    )
    return results
  }
}