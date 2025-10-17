import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"

// GET all connections from MongoDB
export async function GET() {
  try {
    console.log('[v0] Fetching connections from MongoDB...')
    const db = await getDb()
    const connections = await db.collection('api_connections')
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()

    console.log('[v0] Found connections:', connections.length)

    // Transform MongoDB data for frontend
    const transformedConnections = connections.map(conn => ({
      id: conn._id,
      connectionId: conn.connectionId,
      name: conn.name || conn.connectionId,
      description: conn.description || 'API Connection',
      baseUrl: conn.apiConfig?.baseUrl || '',
      method: conn.apiConfig?.method || 'GET',
      isActive: conn.isActive !== false,
      lastRun: conn.lastRun || conn.createdAt,
      totalRuns: conn.totalRuns || 0,
      successRate: conn.successRate || 100,
      createdAt: conn.createdAt
    }))

    return NextResponse.json(transformedConnections)
  } catch (error) {
    console.error('[v0] Error fetching connections:', error)
    // Return empty array on error (graceful degradation)
    return NextResponse.json([])
  }
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
