import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"

// GET /api/data-sample - Lấy dữ liệu mẫu theo connection/query
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId')
    const queryId = searchParams.get('queryId')
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log("[v0] Fetching data samples:", { connectionId, queryId, limit })

    const db = await getDb()

    // Build filter
    const filters: any = {}
    if (connectionId) {
      filters.connectionId = connectionId
    }
    if (queryId) {
      filters.queryId = queryId
    }

    const samples = await db.collection('api_data_sample')
      .find(filters)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    return NextResponse.json({
      samples,
      filters: { connectionId, queryId }
    })
  } catch (error) {
    console.error("[v0] Error fetching data samples:", error)
    return NextResponse.json({ error: "Failed to fetch data samples" }, { status: 500 })
  }
}

// POST /api/data-sample - Lưu dữ liệu mẫu từ test run
export async function POST(request: Request) {
  try {
    const sampleData = await request.json()
    console.log("[v0] Saving data sample:", sampleData)

    // Validate required fields
    if (!sampleData.connectionId || !sampleData.queryId || !sampleData.sampleData) {
      return NextResponse.json({
        error: "Missing required fields: connectionId, queryId, sampleData"
      }, { status: 400 })
    }

    const db = await getDb()

    const newSample = {
      sampleId: Math.random().toString(36).substr(2, 9),
      connectionId: sampleData.connectionId,
      queryId: sampleData.queryId,
      runId: sampleData.runId || null,
      sampleData: sampleData.sampleData,
      rawResponse: sampleData.rawResponse || null,
      fieldMappings: sampleData.fieldMappings || [],
      createdAt: new Date(),
      isActive: true
    }

    const result = await db.collection('api_data_sample').insertOne(newSample)

    console.log("[v0] Successfully saved data sample:", newSample.sampleId)
    return NextResponse.json({
      ...newSample,
      id: result.insertedId
    }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error saving data sample:", error)
    return NextResponse.json({ error: "Failed to save data sample" }, { status: 500 })
  }
}
