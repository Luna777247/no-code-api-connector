import { NextRequest, NextResponse } from "next/server"
import { ApiExecutor } from "@/lib/api-executor"
import { getDb } from "@/lib/mongo"

// POST /api/test-connection - Test API connection configuration
export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Testing API connection")
    
    const body = await request.json()
    const { connectionId, apiConfig, timeout = 30000 } = body

    if (!apiConfig) {
      return NextResponse.json({ 
        error: "API configuration is required",
        valid: false 
      }, { status: 400 })
    }

    // Validate required API config fields
    const { baseUrl, method = 'GET', headers = {} } = apiConfig
    
    if (!baseUrl) {
      return NextResponse.json({ 
        error: "Base URL is required",
        valid: false 
      }, { status: 400 })
    }

    // Validate URL format
    let testUrl: URL
    try {
      testUrl = new URL(baseUrl)
    } catch (urlError) {
      return NextResponse.json({ 
        error: "Invalid URL format",
        valid: false,
        details: "Base URL must be a valid HTTP/HTTPS URL"
      }, { status: 400 })
    }

    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(testUrl.protocol)) {
      return NextResponse.json({ 
        error: "Unsupported protocol",
        valid: false,
        details: "Only HTTP and HTTPS protocols are supported"
      }, { status: 400 })
    }

    const startTime = Date.now()
    let testResult

    try {
      // Use ApiExecutor for actual connection test
      const apiExecutor = new ApiExecutor()
      
      // Create a simple test request using ApiRequest interface
      const testRequest = {
        url: baseUrl.replace(/\/$/, ''), // Remove trailing slash
        method: method.toUpperCase(),
        headers: {
          'User-Agent': 'No-Code-API-Connector/1.0',
          'Accept': 'application/json, text/plain, */*',
          ...headers
        }
      }

      console.log("[v0] Executing connection test:", testRequest)
      
      // Execute the test request
      const response = await apiExecutor.execute(testRequest)
      
      testResult = {
        valid: true,
        success: response.success,
        responseTime: response.responseTime,
        status: response.statusCode || (response.success ? 200 : 500),
        statusText: response.success ? 'OK' : 'Error',
        data: response.data || null,
        error: response.error || null,
        timestamp: new Date().toISOString()
      }

      // If we have connection ID, update the connection test result in database
      if (connectionId) {
        try {
          const db = await getDb()
          await db.collection('api_connections').updateOne(
            { _id: connectionId },
            {
              $set: {
                lastTested: new Date(),
                lastTestResult: testResult,
                isActive: testResult.success
              }
            }
          )
          console.log("[v0] Updated connection test result in database")
        } catch (dbError) {
          console.warn("[v0] Failed to update connection test result:", dbError)
          // Don't fail the whole test if DB update fails
        }
      }

    } catch (connectionError: any) {
      const responseTime = Date.now() - startTime
      
      // Analyze the error type
      let errorType = "CONNECTION_ERROR"
      let errorMessage = "Connection test failed"
      
      if (connectionError.code === 'ENOTFOUND') {
        errorType = "DNS_ERROR"
        errorMessage = "Domain not found"
      } else if (connectionError.code === 'ECONNREFUSED') {
        errorType = "CONNECTION_REFUSED"  
        errorMessage = "Connection refused"
      } else if (connectionError.code === 'ETIMEDOUT' || connectionError.name === 'AbortError') {
        errorType = "TIMEOUT"
        errorMessage = "Connection timeout"
      } else if (connectionError.response) {
        errorType = "HTTP_ERROR"
        errorMessage = `HTTP ${connectionError.response.status}: ${connectionError.response.statusText}`
      }

      testResult = {
        valid: false,
        success: false,
        responseTime,
        error: errorMessage,
        errorType,
        errorCode: connectionError.code,
        status: connectionError.response?.status || null,
        timestamp: new Date().toISOString(),
        details: connectionError.message
      }

      console.log("[v0] Connection test failed:", testResult)
    }

    return NextResponse.json(testResult)

  } catch (error) {
    console.error("[v0] Error in test-connection API:", error)
    return NextResponse.json({ 
      error: "Internal server error during connection test",
      valid: false,
      success: false,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}