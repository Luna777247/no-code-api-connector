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
    
    // Build filter
    const filters: any = {}
    if (connectionId) {
      filters.connectionId = connectionId
    }

    const mappings = await db.collection('api_field_mappings')
      .find(filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    const total = await db.collection('api_field_mappings').countDocuments(filters)

    // If no mappings in DB, return mock data
    if (mappings.length === 0) {
      const mockMappings = [
        {
          id: "mapping_001",
          connectionId: "conn_123",
          connectionName: "Places API",
          name: "User Data Mapping",
          description: "Map user data from API response to database schema",
          mappings: [
            {
              sourcePath: "$.data[*].id",
              targetField: "user_id",
              dataType: "string",
              required: true,
              defaultValue: null,
              transformation: null
            },
            {
              sourcePath: "$.data[*].name", 
              targetField: "full_name",
              dataType: "string",
              required: true,
              defaultValue: "Unknown",
              transformation: "trim|title_case"
            },
            {
              sourcePath: "$.data[*].email",
              targetField: "email_address", 
              dataType: "email",
              required: false,
              defaultValue: null,
              transformation: "lowercase|validate_email"
            },
            {
              sourcePath: "$.data[*].created_at",
              targetField: "registration_date",
              dataType: "datetime", 
              required: true,
              defaultValue: "NOW()",
              transformation: "parse_iso_date"
            }
          ],
          isActive: true,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
          lastUsed: new Date(Date.now() - 3600000).toISOString(),
          usageCount: 25
        },
        {
          id: "mapping_002",
          connectionId: "conn_456", 
          connectionName: "Weather API",
          name: "Weather Data Mapping",
          description: "Transform weather API data to analytics format", 
          mappings: [
            {
              sourcePath: "$.weather.temp",
              targetField: "temperature_celsius",
              dataType: "decimal",
              required: true,
              defaultValue: 0,
              transformation: "round_2_decimal"
            },
            {
              sourcePath: "$.weather.humidity",
              targetField: "humidity_percent", 
              dataType: "integer",
              required: false,
              defaultValue: null,
              transformation: "clamp_0_100"
            }
          ],
          isActive: true,
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          updatedAt: new Date(Date.now() - 7200000).toISOString(),
          lastUsed: new Date(Date.now() - 1800000).toISOString(),
          usageCount: 45
        }
      ].filter(mapping => {
        if (connectionId && mapping.connectionId !== connectionId) return false
        return true
      })

      return NextResponse.json({
        mappings: mockMappings.slice((page - 1) * limit, page * limit),
        pagination: {
          page,
          limit, 
          total: mockMappings.length,
          pages: Math.ceil(mockMappings.length / limit)
        },
        filters: { connectionId }
      })
    }

    return NextResponse.json({
      mappings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
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