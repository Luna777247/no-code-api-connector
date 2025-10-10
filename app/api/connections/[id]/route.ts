import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"

// GET /api/connections/:id - Lấy chi tiết connection
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const connectionId = resolvedParams.id
    console.log("[v0] Fetching connection:", connectionId)

    const db = await getDb()
    const connection = await db.collection('api_connections').findOne({ 
      connectionId: connectionId 
    })

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
        isActive: true,
        createdAt: new Date().toISOString(),
        lastRun: new Date(Date.now() - 3600000).toISOString(),
        totalRuns: 10,
        successRate: 95.5,
        avgResponseTime: 250
      }
      
      return NextResponse.json(mockConnection)
    }

    return NextResponse.json(connection)
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
    const result = await db.collection('api_connections').updateOne(
      { connectionId: connectionId },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      // Create if not exists (upsert behavior)
      const newConnection = {
        connectionId: connectionId,
        ...updateData,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await db.collection('api_connections').insertOne(newConnection)
      console.log("[v0] Created new connection:", connectionId)
      return NextResponse.json(newConnection, { status: 201 })
    }

    // Fetch updated connection
    const updatedConnection = await db.collection('api_connections').findOne({ 
      connectionId: connectionId 
    })

    console.log("[v0] Successfully updated connection:", connectionId)
    return NextResponse.json(updatedConnection)
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
    console.log("[v0] Deleting connection:", connectionId)

    const db = await getDb()
    
    // Check if connection exists and has related data
    const connection = await db.collection('api_connections').findOne({ 
      connectionId: connectionId 
    })

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    // Check for related runs (optional - warn user)
    const relatedRuns = await db.collection('api_runs').countDocuments({ 
      connectionId: connectionId 
    })

    // Delete the connection
    const deleteResult = await db.collection('api_connections').deleteOne({ 
      connectionId: connectionId 
    })

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    console.log("[v0] Successfully deleted connection:", connectionId)
    return NextResponse.json({ 
      message: "Connection deleted successfully",
      connectionId: connectionId,
      relatedRuns: relatedRuns,
      warning: relatedRuns > 0 ? `${relatedRuns} related runs still exist` : null
    })
  } catch (error) {
    console.error("[v0] Error deleting connection:", error)
    return NextResponse.json({ error: "Failed to delete connection" }, { status: 500 })
  }
}