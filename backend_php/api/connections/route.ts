import { NextResponse } from "next/server"

// Mock API endpoint for managing connections
export async function GET() {
  // TODO: Fetch from database
  const connections = [
    {
      id: "1",
      name: "JSONPlaceholder Users API",
      description: "Sample API for testing - fetches user data",
      baseUrl: "https://jsonplaceholder.typicode.com/users",
      method: "GET",
      isActive: true,
      lastRun: new Date(Date.now() - 7200000).toISOString(),
      totalRuns: 15,
      successRate: 100,
    },
  ]

  return NextResponse.json(connections)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("[v0] Creating new connection:", body)

    // TODO: Save to database
    const newConnection = {
      id: Math.random().toString(36).substr(2, 9),
      ...body,
      createdAt: new Date().toISOString(),
      isActive: true,
    }

    return NextResponse.json(newConnection, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating connection:", error)
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 })
  }
}
