import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"

// GET /api/data - Retrieve and analyze data from recent runs
export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Fetching data from recent runs")
    
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get("connectionId")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const skip = parseInt(searchParams.get("skip") || "0")
    const format = searchParams.get("format") || "json"
    const timeRange = searchParams.get("timeRange") || "7d" // 1h, 24h, 7d, 30d

    const db = await getDb()

    // Calculate time filter based on range
    let timeFilter = {}
    const now = new Date()
    switch (timeRange) {
      case "1h":
        timeFilter = { startedAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) } }
        break
      case "24h":
        timeFilter = { startedAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }
        break
      case "7d":
        timeFilter = { startedAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } }
        break
      case "30d":
        timeFilter = { startedAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } }
        break
    }

    // Build query filter
    const filter: any = {
      status: "success", // Only successful runs have data
      ...timeFilter
    }

    if (connectionId) {
      filter.connectionId = connectionId
    }

    // Get runs with data
    const runsWithData = await db.collection('api_runs')
      .find(filter, {
        projection: {
          _id: 1,
          connectionId: 1,
          startedAt: 1,
          completedAt: 1,
          status: 1,
          recordsProcessed: 1,
          dataPreview: 1,
          transformedData: 1,
          executionTime: 1
        }
      })
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    // Get total count for pagination
    const totalRuns = await db.collection('api_runs').countDocuments(filter)

    // Process and structure the data
    const processedData = []
    let totalRecords = 0
    let totalDataSize = 0

    for (const run of runsWithData) {
      const runData: any = {
        runId: run._id,
        connectionId: run.connectionId,
        timestamp: run.startedAt,
        executionTime: run.executionTime || 0,
        recordsProcessed: run.recordsProcessed || 0,
        status: run.status
      }

      // Include data preview if available
      if (run.dataPreview) {
        runData.dataPreview = Array.isArray(run.dataPreview) 
          ? run.dataPreview.slice(0, 5) // Limit preview to 5 records
          : run.dataPreview
      }

      // Include transformed data if format is detailed
      if (format === "detailed" && run.transformedData) {
        runData.transformedData = Array.isArray(run.transformedData)
          ? run.transformedData.slice(0, 10) // Limit to 10 records for detailed view
          : run.transformedData
      }

      processedData.push(runData)
      totalRecords += run.recordsProcessed || 0
      totalDataSize += JSON.stringify(run.transformedData || {}).length
    }

    // Get data statistics
    const dataStats = await db.collection('api_runs').aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: 1 },
          totalRecords: { $sum: "$recordsProcessed" },
          avgExecutionTime: { $avg: "$executionTime" },
          avgRecordsPerRun: { $avg: "$recordsProcessed" },
          minExecutionTime: { $min: "$executionTime" },
          maxExecutionTime: { $max: "$executionTime" }
        }
      }
    ]).toArray()

    // Get connection breakdown
    const connectionBreakdown = await db.collection('api_runs').aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$connectionId",
          runCount: { $sum: 1 },
          totalRecords: { $sum: "$recordsProcessed" },
          avgExecutionTime: { $avg: "$executionTime" },
          lastRun: { $max: "$startedAt" }
        }
      },
      { $sort: { runCount: -1 } },
      { $limit: 10 }
    ]).toArray()

    const result = {
      summary: {
        timeRange,
        totalRuns: totalRuns,
        currentPage: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(totalRuns / limit),
        recordsShown: processedData.length,
        totalRecords: totalRecords,
        estimatedDataSize: `${Math.round(totalDataSize / 1024)}KB`
      },
      statistics: dataStats[0] || {
        totalRuns: 0,
        totalRecords: 0,
        avgExecutionTime: 0,
        avgRecordsPerRun: 0,
        minExecutionTime: 0,
        maxExecutionTime: 0
      },
      connectionBreakdown: connectionBreakdown.map(conn => ({
        connectionId: conn._id,
        runCount: conn.runCount,
        totalRecords: conn.totalRecords || 0,
        avgExecutionTime: Math.round(conn.avgExecutionTime || 0),
        lastRun: conn.lastRun
      })),
      data: processedData,
      metadata: {
        generatedAt: new Date().toISOString(),
        format,
        filters: {
          connectionId: connectionId || "all",
          timeRange,
          status: "success"
        }
      }
    }

    console.log(`[v0] Retrieved ${processedData.length} data records from ${totalRuns} total runs`)
    return NextResponse.json(result)

  } catch (error) {
    console.error("[v0] Error fetching data:", error)
    return NextResponse.json({ 
      error: "Failed to fetch data",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}