import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"

// GET /api/mappings/:id - Lấy chi tiết field mapping
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const mappingId = params.id
    console.log("[v0] Fetching field mapping:", mappingId)

    const db = await getDb()
    const mapping = await db.collection('api_field_mappings').findOne({ 
      mappingId: mappingId 
    })

    if (!mapping) {
      // Mock data for development
      const mockMapping = {
        id: mappingId,
        connectionId: "conn_123",
        connectionName: "Sample API Connection",
        name: `Field Mapping ${mappingId}`,
        description: "Sample field mapping configuration",
        mappings: [
          {
            sourcePath: "$.data[*].id", 
            targetField: "record_id",
            dataType: "string",
            required: true,
            defaultValue: null,
            transformation: null,
            validation: {
              pattern: "^[A-Za-z0-9]+$",
              minLength: 1,
              maxLength: 50
            }
          },
          {
            sourcePath: "$.data[*].attributes.name",
            targetField: "display_name", 
            dataType: "string",
            required: false,
            defaultValue: "Unnamed",
            transformation: "trim|title_case",
            validation: {
              maxLength: 100
            }
          },
          {
            sourcePath: "$.data[*].attributes.created_date",
            targetField: "created_timestamp",
            dataType: "datetime",
            required: true, 
            defaultValue: "NOW()",
            transformation: "parse_iso_date|utc_timezone"
          }
        ],
        isActive: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsed: new Date(Date.now() - 3600000).toISOString(),
        usageCount: 15,
        testResults: {
          lastTested: new Date(Date.now() - 7200000).toISOString(),
          samplesProcessed: 100,
          successRate: 98.5,
          errors: [
            { field: "display_name", error: "Null value", count: 2 }
          ]
        }
      }
      
      return NextResponse.json(mockMapping)
    }

    return NextResponse.json(mapping)
  } catch (error) {
    console.error("[v0] Error fetching field mapping:", error)
    return NextResponse.json({ error: "Failed to fetch field mapping" }, { status: 500 })
  }
}

// PUT /api/mappings/:id - Cập nhật field mapping
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const mappingId = params.id
    const updateData = await request.json()
    
    console.log("[v0] Updating field mapping:", mappingId, updateData)

    // Validate mapping structure if provided
    if (updateData.mappings) {
      for (const mapping of updateData.mappings) {
        if (!mapping.sourcePath || !mapping.targetField || !mapping.dataType) {
          return NextResponse.json({ 
            error: "Invalid mapping structure. Each mapping requires: sourcePath, targetField, dataType" 
          }, { status: 400 })
        }
      }
    }

    const db = await getDb()
    const result = await db.collection('api_field_mappings').updateOne(
      { mappingId: mappingId },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        },
        $setOnInsert: {
          mappingId: mappingId,
          createdAt: new Date(),
          usageCount: 0,
          lastUsed: null
        }
      },
      { upsert: true }
    )

    // Fetch updated/created mapping
    const updatedMapping = await db.collection('api_field_mappings').findOne({ 
      mappingId: mappingId 
    })

    console.log("[v0] Successfully updated field mapping:", mappingId)
    return NextResponse.json(updatedMapping)
  } catch (error) {
    console.error("[v0] Error updating field mapping:", error)
    return NextResponse.json({ error: "Failed to update field mapping" }, { status: 500 })
  }
}

// DELETE /api/mappings/:id - Xóa field mapping
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const mappingId = params.id
    console.log("[v0] Deleting field mapping:", mappingId)

    const db = await getDb()
    
    // Check if mapping exists
    const mapping = await db.collection('api_field_mappings').findOne({ 
      mappingId: mappingId 
    })

    if (!mapping) {
      return NextResponse.json({ error: "Field mapping not found" }, { status: 404 })
    }

    // Check if mapping is being used by active connections
    const activeConnections = await db.collection('api_connections').countDocuments({
      fieldMappingId: mappingId,
      isActive: true
    })

    if (activeConnections > 0) {
      return NextResponse.json({ 
        error: `Cannot delete field mapping. It is being used by ${activeConnections} active connections.` 
      }, { status: 400 })
    }

    // Delete the mapping
    const deleteResult = await db.collection('api_field_mappings').deleteOne({ 
      mappingId: mappingId 
    })

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: "Field mapping not found" }, { status: 404 })
    }

    console.log("[v0] Successfully deleted field mapping:", mappingId)
    return NextResponse.json({ 
      message: "Field mapping deleted successfully",
      mappingId: mappingId,
      usageCount: mapping.usageCount || 0
    })
  } catch (error) {
    console.error("[v0] Error deleting field mapping:", error)
    return NextResponse.json({ error: "Failed to delete field mapping" }, { status: 500 })
  }
}