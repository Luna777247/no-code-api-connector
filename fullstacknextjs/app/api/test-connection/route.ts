import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.text()
    console.log("[v0] Test connection request body:", body)

    if (!body) {
      return NextResponse.json(
        { success: false, error: "Request body is empty" },
        { status: 400 }
      )
    }

    const { apiConfig } = JSON.parse(body)

    if (!apiConfig || !apiConfig.baseUrl) {
      return NextResponse.json(
        { success: false, error: "API configuration with baseUrl is required" },
        { status: 400 }
      )
    }

    console.log("[v0] Testing connection to:", apiConfig.baseUrl)

    // Make a test request to the API endpoint
    const response = await fetch(apiConfig.baseUrl, {
      method: apiConfig.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers
      },
      // For safety, don't send a body for GET requests and limit timeout
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (response.ok) {
      console.log("[v0] Connection test successful")
      return NextResponse.json({
        success: true,
        message: "Connection test successful",
        status: response.status,
        statusText: response.statusText
      })
    } else {
      console.log("[v0] Connection test failed:", response.status, response.statusText)
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        statusText: response.statusText
      })
    }

  } catch (error) {
    console.error("[v0] Connection test error:", error)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: "Connection test timed out (10 seconds)"
        })
      }

      return NextResponse.json({
        success: false,
        error: `Connection failed: ${error.message}`
      })
    }

    return NextResponse.json({
      success: false,
      error: "Unknown error occurred during connection test"
    })
  }
}
