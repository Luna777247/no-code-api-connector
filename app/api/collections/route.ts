import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"

// GET /api/collections - Lấy danh sách collections đích
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    console.log("[v0] Fetching collections:", { connectionId, page, limit })

    const db = await getDb()

    // Build filter
    const filters: any = {}
    if (connectionId) {
      filters.connectionId = connectionId
    }

    const collections = await db.collection('api_collections')
      .find(filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    const total = await db.collection('api_collections').countDocuments(filters)

    return NextResponse.json({
      collections,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: { connectionId }
    })
  } catch (error) {
    console.error("[v0] Error fetching collections:", error)
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 })
  }
}

// POST /api/collections - Tạo collection đích mới
export async function POST(request: Request) {
  try {
    const collectionData = await request.json()
    console.log("[v0] Creating new collection:", collectionData)

    // Validate required fields
    if (!collectionData.name || !collectionData.connectionId) {
      return NextResponse.json({
        error: "Missing required fields: name, connectionId"
      }, { status: 400 })
    }

    const db = await getDb()

    const newCollection = {
      collectionId: Math.random().toString(36).substr(2, 9),
      connectionId: collectionData.connectionId,
      name: collectionData.name,
      description: collectionData.description || '',
      collectionName: collectionData.collectionName || `api_${collectionData.name.toLowerCase().replace(/\s+/g, '_')}`,
      schema: collectionData.schema || {},
      indexes: collectionData.indexes || [],
      isActive: collectionData.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsed: null,
      totalRecords: 0,
      dataSize: 0
    }

    const result = await db.collection('api_collections').insertOne(newCollection)

    console.log("[v0] Successfully created collection:", newCollection.collectionId)
    return NextResponse.json({
      ...newCollection,
      id: result.insertedId
    }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating collection:", error)
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 })
  }
}