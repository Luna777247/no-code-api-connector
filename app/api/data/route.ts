import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"
import { CollectionManager } from "@/lib/database-schema"

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
        timeFilter = { $expr: { $gte: [{ $dateFromString: { dateString: "$runMetadata.startedAt" } }, new Date(now.getTime() - 60 * 60 * 1000)] } }
        break
      case "24h":
        timeFilter = { $expr: { $gte: [{ $dateFromString: { dateString: "$runMetadata.startedAt" } }, new Date(now.getTime() - 24 * 60 * 60 * 1000)] } }
        break
      case "7d":
        timeFilter = { $expr: { $gte: [{ $dateFromString: { dateString: "$runMetadata.startedAt" } }, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)] } }
        break
      case "30d":
        timeFilter = { $expr: { $gte: [{ $dateFromString: { dateString: "$runMetadata.startedAt" } }, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)] } }
        break
      default:
        // No time filter for "all" or invalid range
        timeFilter = {}
    }

    // Build query filter
    const filter: any = {
      type: 'run',
      'runMetadata.status': "success", // Only successful runs have data
      ...timeFilter
    }

    if (connectionId) {
      filter.connectionId = connectionId
    }

    // Get runs with data
    const runsWithData = await db.collection(CollectionManager.getCollectionName('DATA'))
      .find(filter, {
        projection: {
          _id: 1,
          connectionId: 1,
          'runMetadata.startedAt': 1,
          'runMetadata.completedAt': 1,
          'runMetadata.status': 1,
          'runMetadata.recordsExtracted': 1,
          dataPreview: 1,
          data: 1,
          'runMetadata.duration': 1
        }
      })
      .sort({ 'runMetadata.startedAt': -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    // Get total count for pagination
    const totalRuns = await db.collection(CollectionManager.getCollectionName('DATA')).countDocuments(filter)

    // Process and structure the data
    const processedData = []
    let totalRecords = 0
    let totalDataSize = 0

    for (const run of runsWithData) {
      const runData: any = {
        runId: run._id,
        connectionId: run.connectionId,
        timestamp: run.runMetadata?.startedAt,
        executionTime: run.runMetadata?.duration || 0,
        recordsProcessed: run.runMetadata?.recordsExtracted || 0,
        status: run.runMetadata?.status
      }

      // Include data preview if available
      if (run.dataPreview) {
        runData.dataPreview = Array.isArray(run.dataPreview) 
          ? run.dataPreview.slice(0, 5) // Limit preview to 5 records
          : run.dataPreview
      }

      // Include transformed data if format is detailed
      if (format === "detailed" && run.data) {
        runData.transformedData = Array.isArray(run.data)
          ? run.data.slice(0, 10) // Limit to 10 records for detailed view
          : run.data
      }

      processedData.push(runData)
      totalRecords += run.runMetadata?.recordsExtracted || 0
      totalDataSize += JSON.stringify(run.data || {}).length
    }

    // Get data statistics
    const dataStats = await db.collection(CollectionManager.getCollectionName('DATA')).aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: 1 },
          totalRecords: { $sum: "$runMetadata.recordsExtracted" },
          avgExecutionTime: { $avg: "$runMetadata.duration" },
          avgRecordsPerRun: { $avg: "$runMetadata.recordsExtracted" },
          minExecutionTime: { $min: "$runMetadata.duration" },
          maxExecutionTime: { $max: "$runMetadata.duration" }
        }
      }
    ]).toArray()

    // Get connection breakdown
    const connectionBreakdown = await db.collection(CollectionManager.getCollectionName('DATA')).aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$connectionId",
          runCount: { $sum: 1 },
          totalRecords: { $sum: "$runMetadata.recordsExtracted" },
          avgExecutionTime: { $avg: "$runMetadata.duration" },
          lastRun: { $max: "$runMetadata.startedAt" }
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