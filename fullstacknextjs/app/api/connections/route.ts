import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"
import { CollectionManager } from "@/lib/database-schema"

// GET all connections from MongoDB
export async function GET() {
  try {
    const db = await getDb()
    const connections = await db
      .collection(CollectionManager.getCollectionName("METADATA"))
      .find(CollectionManager.getMetadataQuery("connection"))
      .sort({ _insertedAt: -1 })
      .limit(50)
      .toArray()

    // Transform MongoDB data for frontend
    const transformedConnections = connections.map((conn) => ({
      id: conn._id,
      connectionId: conn._id,
      name: conn.connectionData?.name || "API Connection",
      description: "API Connection",
      baseUrl: conn.connectionData?.apiConfig?.baseUrl || "",
      method: conn.connectionData?.apiConfig?.method || "GET",
      tableName: conn.connectionData?.tableName || "api_places_standardized",
      isActive: true,
      lastRun: conn._insertedAt,
      totalRuns: 0,
      successRate: 100,
      createdAt: conn._insertedAt,
    }))

    return NextResponse.json(transformedConnections)
  } catch (error) {
    console.error("[v0] Error fetching connections:", error)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const db = await getDb()
    const connectionId = body.connectionId || `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const metadataDocument = {
      type: "connection" as const,
      _connectionId: connectionId,
      _insertedAt: new Date().toISOString(),
      connectionData: {
        name: body.name || connectionId,
        description: body.description || "",
        apiConfig: {
          baseUrl: body.baseUrl || body.apiConfig?.baseUrl || "",
          method: body.method || body.apiConfig?.method || "GET",
          endpoint: body.endpoint || body.apiConfig?.endpoint || "",
          headers: body.headers || body.apiConfig?.headers,
          authType: body.authType || body.apiConfig?.authType,
          authConfig: body.authConfig || body.apiConfig?.authConfig,
        },
        parameters: body.parameters || [],
        fieldMappings: body.fieldMappings || [],
        tableName: body.tableName || "api_places_standardized",
        validationRules: body.validationRules || [],
        options: body.options || {},
      },
    }

    const result = await db.collection(CollectionManager.getCollectionName("METADATA")).insertOne(metadataDocument)

    const savedConnection = {
      id: result.insertedId,
      connectionId,
      name: body.name || connectionId,
      baseUrl: body.baseUrl || body.apiConfig?.baseUrl || "",
      method: body.method || body.apiConfig?.method || "GET",
      tableName: body.tableName || "api_places_standardized",
      isActive: true,
      createdAt: metadataDocument._insertedAt,
    }

    return NextResponse.json(savedConnection, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating connection:", error)
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 })
  }
}
