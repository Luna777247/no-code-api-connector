import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"
import { CollectionManager } from "@/lib/database-schema"
import { ObjectId } from "mongodb"

// Helper function to safely get ObjectId or find by name/id
async function findConnectionById(db: any, connectionId: string) {
  // Try to parse as ObjectId
  try {
    const objectId = new ObjectId(connectionId);
    const connection = await db.collection(CollectionManager.getCollectionName('METADATA')).findOne({
      type: 'connection',
      _id: objectId
    });
    return connection;
  } catch (error) {
    console.log("[v0] Invalid ObjectId format, searching by name/id:", connectionId);
    // If not a valid ObjectId, search by connectionData.name or other identifier
    const connection = await db.collection(CollectionManager.getCollectionName('METADATA')).findOne({
      type: 'connection',
      $or: [
        { 'connectionData.name': connectionId },
        { 'connectionData.connectionId': connectionId }
      ]
    });
    return connection;
  }
}

// GET /api/connections/:id - Lấy chi tiết connection
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const connectionId = resolvedParams.id
    console.log("[v0] Fetching connection:", connectionId)

    const db = await getDb()
    const connection = await findConnectionById(db, connectionId)

    if (!connection) {
      // Mock data for development
      const mockConnection = {
        id: connectionId,
        name: `Connection ${connectionId}`,
        description: "Sample connection for testing",
        baseUrl: "https://api.example.com/data",
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        },
        authType: "none",
        tableName: "api_places_standardized",
        isActive: true,
        createdAt: new Date().toISOString(),
        lastRun: new Date(Date.now() - 3600000).toISOString(),
        totalRuns: 10,
        successRate: 95.5,
        avgResponseTime: 250
      }

      return NextResponse.json(mockConnection)
    }

    return NextResponse.json({
      id: connection._id,
      connectionId: connection._id,
      name: connection.connectionData?.name || connectionId,
      description: "API Connection",
      baseUrl: connection.connectionData?.apiConfig?.baseUrl || '',
      method: connection.connectionData?.apiConfig?.method || 'GET',
      headers: connection.connectionData?.apiConfig?.headers || {},
      authType: connection.connectionData?.apiConfig?.authType || 'none',
      tableName: connection.connectionData?.tableName || 'api_places_standardized',
      isActive: true,
      createdAt: connection._insertedAt,
      lastRun: connection._insertedAt,
      totalRuns: 0,
      successRate: 100,
      avgResponseTime: 0
    })
  } catch (error) {
    console.error("[v0] Error fetching connection:", error)
    return NextResponse.json({ error: "Failed to fetch connection" }, { status: 500 })
  }
}

// PUT /api/connections/:id - Cập nhật connection
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const connectionId = resolvedParams.id
    const updateData = await request.json()

    console.log("[v0] Updating connection:", connectionId, updateData)

    const db = await getDb()

    // Find existing connection
    const existingConnection = await findConnectionById(db, connectionId)
    const connectionObjectId = existingConnection ? existingConnection._id : new ObjectId()

    // Update connection in metadata collection
    const updateDoc = {
      $set: {
        'connectionData.name': updateData.name || connectionId,
        'connectionData.apiConfig.baseUrl': updateData.baseUrl || updateData.apiConfig?.baseUrl,
        'connectionData.apiConfig.method': updateData.method || updateData.apiConfig?.method,
        'connectionData.apiConfig.headers': updateData.headers || updateData.apiConfig?.headers,
        'connectionData.apiConfig.authType': updateData.authType || updateData.apiConfig?.authType,
        'connectionData.apiConfig.authConfig': updateData.authConfig || updateData.apiConfig?.authConfig,
        'connectionData.parameters': updateData.parameters,
        'connectionData.fieldMappings': updateData.fieldMappings,
        'connectionData.tableName': updateData.tableName,
        'connectionData.validationRules': updateData.validationRules,
        'connectionData.options': updateData.options,
        _updatedAt: new Date().toISOString()
      }
    }

    const result = await db.collection(CollectionManager.getCollectionName('METADATA')).updateOne(
      { type: 'connection', _id: connectionObjectId },
      updateDoc
    )

    if (result.matchedCount === 0) {
      // Create if not exists
      const newConnection = {
        type: 'connection' as const,
        _id: new ObjectId(connectionId),
        _insertedAt: new Date().toISOString(),
        connectionData: {
          name: updateData.name || connectionId,
          apiConfig: {
            baseUrl: updateData.baseUrl || updateData.apiConfig?.baseUrl || '',
            method: updateData.method || updateData.apiConfig?.method || 'GET',
            headers: updateData.headers || updateData.apiConfig?.headers,
            authType: updateData.authType || updateData.apiConfig?.authType,
            authConfig: updateData.authConfig || updateData.apiConfig?.authConfig
          },
          parameters: updateData.parameters || [],
          fieldMappings: updateData.fieldMappings || [],
          tableName: updateData.tableName || 'api_places_standardized',
          validationRules: updateData.validationRules || [],
          options: updateData.options || {}
        }
      }

      await db.collection(CollectionManager.getCollectionName('METADATA')).insertOne(newConnection)
      console.log("[v0] Created new connection:", connectionId)
      return NextResponse.json(newConnection, { status: 201 })
    }

    // Fetch updated connection
    const updatedConnection = await db.collection(CollectionManager.getCollectionName('METADATA')).findOne({
      type: 'connection',
      _id: new ObjectId(connectionId)
    })

    if (!updatedConnection) {
      return NextResponse.json({ error: "Connection not found after update" }, { status: 404 })
    }

    console.log("[v0] Successfully updated connection:", connectionId)
    
    // Transform response to match GET format
    const transformedConnection = {
      id: updatedConnection._id,
      connectionId: updatedConnection._id,
      name: updatedConnection.connectionData?.name || connectionId,
      description: "API Connection",
      baseUrl: updatedConnection.connectionData?.apiConfig?.baseUrl || '',
      method: updatedConnection.connectionData?.apiConfig?.method || 'GET',
      headers: updatedConnection.connectionData?.apiConfig?.headers || {},
      authType: updatedConnection.connectionData?.apiConfig?.authType || 'none',
      tableName: updatedConnection.connectionData?.tableName || 'api_places_standardized',
      isActive: true,
      createdAt: updatedConnection._insertedAt,
      lastRun: updatedConnection._insertedAt,
      totalRuns: 0,
      successRate: 100,
      avgResponseTime: 0
    }
    
    return NextResponse.json(transformedConnection)
  } catch (error) {
    console.error("[v0] Error updating connection:", error)
    return NextResponse.json({ error: "Failed to update connection" }, { status: 500 })
  }
}

// DELETE /api/connections/:id - Xóa connection
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const connectionId = resolvedParams.id
    const url = new URL(request.url)
    const deleteData = url.searchParams.get('deleteData') === 'true'
    
    console.log("[v0] Deleting connection:", connectionId, { deleteData })

    const db = await getDb()

    // Check if connection exists
    const connection = await findConnectionById(db, connectionId)

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    let deletedRunsCount = 0
    let relatedRuns = 0

    if (deleteData) {
      // Count and delete all related runs
      relatedRuns = await db.collection(CollectionManager.getCollectionName('DATA')).countDocuments({
        connectionId: connectionId
      })

      if (relatedRuns > 0) {
        const deleteRunsResult = await db.collection(CollectionManager.getCollectionName('DATA')).deleteMany({
          connectionId: connectionId
        })
        deletedRunsCount = deleteRunsResult.deletedCount || 0
        console.log(`[v0] Deleted ${deletedRunsCount} related runs for connection:`, connectionId)
      }
    } else {
      // Just count related runs for warning
      relatedRuns = await db.collection(CollectionManager.getCollectionName('DATA')).countDocuments({
        connectionId: connectionId
      })
    }

    // Delete the connection
    const deleteResult = await db.collection(CollectionManager.getCollectionName('METADATA')).deleteOne({
      type: 'connection',
      _id: connection._id
    })

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    console.log("[v0] Successfully deleted connection:", connectionId)
    return NextResponse.json({
      message: deleteData ? "Connection and all related data deleted successfully" : "Connection deleted successfully",
      connectionId: connectionId,
      relatedRuns: relatedRuns,
      deletedRuns: deleteData ? deletedRunsCount : 0,
      warning: !deleteData && relatedRuns > 0 ? `${relatedRuns} related runs still exist in database` : null
    })
  } catch (error) {
    console.error("[v0] Error deleting connection:", error)
    return NextResponse.json({ error: "Failed to delete connection" }, { status: 500 })
  }
}