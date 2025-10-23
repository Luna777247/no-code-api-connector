import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"

// GET /api/mappings - Lấy danh sách field mappings
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    console.log("[v0] Fetching field mappings:", { connectionId, page, limit })

    const db = await getDb()

    // Build filter for connections
    const filters: any = { type: 'connection' }
    if (connectionId) {
      filters._connectionId = connectionId
    }

    // Get connections with field mappings
    const connections = await db.collection('api_metadata')
      .find(filters)
      .sort({ _insertedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    // Transform connections to mapping format
    const mappings = connections
      .filter(conn => conn.connectionData?.fieldMappings && conn.connectionData.fieldMappings.length > 0)
      .map(conn => ({
        id: conn._id,
        connectionId: conn._connectionId,
        connectionName: conn.connectionData?.name || 'Unknown Connection',
        tableName: conn.connectionData?.tableName || 'N/A',
        fieldCount: conn.connectionData?.fieldMappings?.length || 0,
        lastUpdated: conn._insertedAt,
        fields: conn.connectionData?.fieldMappings || []
      }))

    const totalConnections = await db.collection('api_metadata').countDocuments(filters)
    const totalMappings = mappings.length

    return NextResponse.json({
      mappings,
      pagination: {
        page,
        limit,
        total: totalMappings,
        pages: Math.ceil(totalConnections / limit)
      },
      filters: { connectionId }
    })
  } catch (error) {
    console.error("[v0] Error fetching field mappings:", error)
    return NextResponse.json({ error: "Failed to fetch field mappings" }, { status: 500 })
  }
}

// POST /api/mappings - Tạo field mapping mới
export async function POST(request: Request) {
  try {
    const mappingData = await request.json()
    console.log("[v0] Creating field mapping:", mappingData)

    // Validate required fields
    if (!mappingData.name || !mappingData.connectionId || !mappingData.mappings) {
      return NextResponse.json({ 
        error: "Missing required fields: name, connectionId, mappings" 
      }, { status: 400 })
    }

    // Validate mapping structure
    for (const mapping of mappingData.mappings) {
      if (!mapping.sourcePath || !mapping.targetField || !mapping.dataType) {
        return NextResponse.json({ 
          error: "Invalid mapping structure. Each mapping requires: sourcePath, targetField, dataType" 
        }, { status: 400 })
      }
    }

    const db = await getDb()
    
    const newMapping = {
      mappingId: Math.random().toString(36).substr(2, 9),
      ...mappingData,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsed: null,
      usageCount: 0
    }

    await db.collection('api_field_mappings').insertOne(newMapping)

    console.log("[v0] Successfully created field mapping:", newMapping.mappingId)
    return NextResponse.json(newMapping, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating field mapping:", error)
    return NextResponse.json({ error: "Failed to create field mapping" }, { status: 500 })
  }
}