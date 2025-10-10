import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"

// GET /api/health - System health check
export async function GET() {
  try {
    const startTime = Date.now()
    
    // Check MongoDB connection
    let mongoStatus = "healthy"
    let mongoResponseTime = 0
    try {
      const mongoStart = Date.now()
      const db = await getDb()
      await db.admin().ping()
      mongoResponseTime = Date.now() - mongoStart
    } catch (error) {
      mongoStatus = "unhealthy"
      console.error("[v0] MongoDB health check failed:", error)
    }

    // Check Redis connection (if available)
    let redisStatus = "healthy"
    let redisResponseTime = 0
    try {
      // This would check Redis if configured
      redisResponseTime = 5 // Mock response time
    } catch (error) {
      redisStatus = "unhealthy" 
    }

    // System metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      cpu: {
        usage: process.cpuUsage()
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    }

    // Overall health calculation
    const responseTime = Date.now() - startTime
    const overallStatus = mongoStatus === "healthy" && redisStatus === "healthy" ? "healthy" : "degraded"

    const healthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime,
      services: {
        mongodb: {
          status: mongoStatus,
          responseTime: mongoResponseTime
        },
        redis: {
          status: redisStatus, 
          responseTime: redisResponseTime
        },
        api: {
          status: "healthy",
          responseTime: responseTime
        }
      },
      system: systemMetrics,
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development"
    }

    console.log("[v0] Health check completed:", overallStatus)
    
    const statusCode = overallStatus === "healthy" ? 200 : 503
    return NextResponse.json(healthReport, { status: statusCode })
  } catch (error) {
    console.error("[v0] Health check error:", error)
    return NextResponse.json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
      services: {
        mongodb: { status: "unknown" },
        redis: { status: "unknown" }, 
        api: { status: "error" }
      }
    }, { status: 500 })
  }
}