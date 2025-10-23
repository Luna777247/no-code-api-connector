import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"

// GET /api/config - Retrieve system configuration and settings
export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Fetching system configuration")
    
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") // "system", "api", "database", "security"
    const format = searchParams.get("format") || "json"
    const includeSecrets = searchParams.get("includeSecrets") === "true"

    // Base system configuration
    const systemConfig = {
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      buildTimestamp: new Date().toISOString(),
      platform: {
        node: process.version,
        platform: process.platform,
        architecture: process.arch,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      runtime: {
        uptime: Math.round(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        cpu: {
          platform: process.platform,
          cpuUsage: process.cpuUsage()
        }
      }
    }

    // API Configuration
    const apiConfig = {
      endpoints: {
        base: "/api",
        version: "v1",
        timeout: 30000,
        maxRetries: 3,
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          maxRequests: 100
        }
      },
      features: {
        connections: { enabled: true, maxConnections: 100 },
        runs: { enabled: true, maxConcurrent: 10, historyRetention: "30d" },
        schedules: { enabled: true, maxSchedules: 50 },
        mappings: { enabled: true, maxMappingsPerConnection: 20 },
        analytics: { enabled: true, cacheTtl: 300 },
        monitoring: { enabled: true, healthCheckInterval: 60 }
      },
      formats: ["json", "xml", "csv"],
      authentication: {
        methods: ["bearer", "apikey", "basic"],
        headerSupport: true,
        queryParamSupport: false
      }
    }

    // Database Configuration
    let databaseConfig: any = {
      type: "MongoDB",
      status: "unknown",
      collections: {
        api_connections: { indexed: true, estimated_size: "unknown" },
        api_runs: { indexed: true, estimated_size: "unknown" },
        api_schedules: { indexed: true, estimated_size: "unknown" },
        api_field_mappings: { indexed: true, estimated_size: "unknown" }
      },
      indexes: {
        performance_optimized: true,
        text_search_enabled: false
      }
    }

    // Try to get actual database info
    try {
      const db = await getDb()
      
      // Get database stats
      const dbStats = await db.stats()
      const collections = await db.listCollections().toArray()
      
      databaseConfig = {
        ...databaseConfig,
        status: "connected",
        info: {
          name: db.databaseName,
          collections: collections.length,
          dataSize: `${Math.round((dbStats.dataSize || 0) / 1024 / 1024)}MB`,
          storageSize: `${Math.round((dbStats.storageSize || 0) / 1024 / 1024)}MB`,
          indexes: dbStats.indexes || 0,
          avgObjSize: Math.round(dbStats.avgObjSize || 0)
        },
        collections: {}
      }

      // Get detailed collection info
      for (const collection of collections) {
        const collStats = await db.collection(collection.name).estimatedDocumentCount()
        databaseConfig.collections[collection.name] = {
          documents: collStats,
          indexed: true,
          type: collection.type || "collection"
        }
      }

    } catch (dbError) {
      console.warn("[v0] Could not fetch database info:", dbError)
      databaseConfig.status = "error"
      databaseConfig.error = "Connection failed"
    }

    // Security Configuration (filtered)
    const securityConfig = {
      cors: {
        enabled: true,
        origins: process.env.ALLOWED_ORIGINS || "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
      },
      headers: {
        contentSecurityPolicy: true,
        xFrameOptions: true,
        crossOriginEmbedderPolicy: false
      },
      encryption: {
        https: process.env.NODE_ENV === "production",
        apiKeys: "encrypted",
        secrets: includeSecrets ? "visible" : "hidden"
      },
      rateLimit: {
        enabled: true,
        strategy: "sliding_window"
      }
    }

    // Environment Variables (filtered for security)
    const envConfig = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT || "3000",
      // Only include non-sensitive env vars
      ...(includeSecrets && {
        DATABASE_URL: process.env.DATABASE_URL ? "***configured***" : "not_set",
        REDIS_URL: process.env.REDIS_URL ? "***configured***" : "not_set",
        API_SECRET: process.env.API_SECRET ? "***configured***" : "not_set"
      })
    }

    // Build response based on category filter
    let responseConfig: any = {
      timestamp: new Date().toISOString(),
      system: systemConfig,
      api: apiConfig,
      database: databaseConfig,
      security: securityConfig,
      environment: envConfig
    }

    // Filter by category if specified
    if (category) {
      const validCategories = ["system", "api", "database", "security", "environment"]
      if (!validCategories.includes(category)) {
        return NextResponse.json({
          error: "Invalid category",
          validCategories
        }, { status: 400 })
      }

      responseConfig = {
        timestamp: responseConfig.timestamp,
        category,
        config: responseConfig[category]
      }
    }

    // Add metadata
    responseConfig.metadata = {
      generatedAt: new Date().toISOString(),
      format,
      category: category || "all",
      includeSecrets,
      configVersion: "1.0"
    }

    console.log("[v0] System configuration retrieved successfully")
    return NextResponse.json(responseConfig)

  } catch (error) {
    console.error("[v0] Error fetching configuration:", error)
    return NextResponse.json({ 
      error: "Failed to fetch configuration",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// PUT /api/config - Update system configuration (basic settings only)
export async function PUT(request: NextRequest) {
  try {
    console.log("[v0] Updating system configuration")
    
    const body = await request.json()
    const { category, settings } = body

    if (!category || !settings) {
      return NextResponse.json({
        error: "Category and settings are required",
        requiredFields: ["category", "settings"]
      }, { status: 400 })
    }

    const validCategories = ["api", "features", "rateLimit"]
    if (!validCategories.includes(category)) {
      return NextResponse.json({
        error: "Invalid configuration category",
        validCategories
      }, { status: 400 })
    }

    // In a real implementation, this would update a configuration store
    // For now, we'll simulate updating settings and return success
    
    console.log(`[v0] Configuration update simulated for category: ${category}`)
    
    const updateResult = {
      success: true,
      category,
      updatedSettings: settings,
      appliedAt: new Date().toISOString(),
      message: "Configuration update simulated (no persistence implemented)",
      note: "In production, this would update the actual configuration store"
    }

    return NextResponse.json(updateResult)

  } catch (error) {
    console.error("[v0] Error updating configuration:", error)
    return NextResponse.json({ 
      error: "Failed to update configuration",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}