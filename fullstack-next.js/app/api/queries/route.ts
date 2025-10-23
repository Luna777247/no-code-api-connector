import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"

// GET /api/queries - Lấy danh sách queries theo connection
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    console.log("[v0] Fetching queries:", { connectionId, page, limit })

    const db = await getDb()

    // Build filter
    const filters: any = {}
    if (connectionId) {
      filters.connectionId = connectionId
    }

    const queries = await db.collection('api_queries')
      .find(filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    const total = await db.collection('api_queries').countDocuments(filters)

    return NextResponse.json({
      queries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: { connectionId }
    })
  } catch (error) {
    console.error("[v0] Error fetching queries:", error)
    return NextResponse.json({ error: "Failed to fetch queries" }, { status: 500 })
  }
}

// POST /api/queries - Tạo query mới
export async function POST(request: Request) {
  try {
    const queryData = await request.json()
    console.log("[v0] Creating new query:", queryData)

    // Validate required fields
    if (!queryData.connectionId || !queryData.name || !queryData.endpoint) {
      return NextResponse.json({
        error: "Missing required fields: connectionId, name, endpoint"
      }, { status: 400 })
    }

    const db = await getDb()

    const newQuery = {
      queryId: Math.random().toString(36).substr(2, 9),
      connectionId: queryData.connectionId,
      name: queryData.name,
      description: queryData.description || '',
      endpoint: queryData.endpoint,
      method: queryData.method || 'GET',
      parameters: queryData.parameters || [],
      headers: queryData.headers || {},
      body: queryData.body || null,
      authType: queryData.authType || 'none',
      authConfig: queryData.authConfig || {},
      isActive: queryData.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastRun: null,
      totalRuns: 0,
      successRate: 100
    }

    const result = await db.collection('api_queries').insertOne(newQuery)

    console.log("[v0] Successfully created query:", newQuery.queryId)
    return NextResponse.json({
      ...newQuery,
      id: result.insertedId
    }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating query:", error)
    return NextResponse.json({ error: "Failed to create query" }, { status: 500 })
  }
}