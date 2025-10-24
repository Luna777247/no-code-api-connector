import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"
import { CollectionManager } from "@/lib/database-schema"

interface TimeFilter {
  $expr?: {
    $gte: [{ $dateFromString: { dateString: string } }, Date]
  }
}

interface RunData {
  _id: string
  connectionId: string
  runMetadata?: {
    startedAt: string
    completedAt?: string
    status: string
    recordsExtracted?: number
    duration?: number
  }
  dataPreview?: unknown[]
  data?: unknown[]
}

interface DataStats {
  _id: null
  totalRuns: number
  totalRecords: number
  avgExecutionTime: number
  avgRecordsPerRun: number
  minExecutionTime: number
  maxExecutionTime: number
}

interface ConnectionBreakdown {
  _id: string
  runCount: number
  totalRecords: number
  avgExecutionTime: number
  lastRun: string
}

// GET /api/data - Retrieve and analyze data from recent runs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get("connectionId") || undefined
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const skip = Number.parseInt(searchParams.get("skip") || "0")
    const format = searchParams.get("format") || "json"
    const timeRange = searchParams.get("timeRange") || "7d"

    const db = await getDb()

    let timeFilter: TimeFilter = {}
    const now = new Date()
    switch (timeRange) {
      case "1h":
        timeFilter = {
          $expr: {
            $gte: [
              { $dateFromString: { dateString: "$runMetadata.startedAt" } },
              new Date(now.getTime() - 60 * 60 * 1000),
            ],
          },
        }
        break
      case "24h":
        timeFilter = {
          $expr: {
            $gte: [
              { $dateFromString: { dateString: "$runMetadata.startedAt" } },
              new Date(now.getTime() - 24 * 60 * 60 * 1000),
            ],
          },
        }
        break
      case "7d":
        timeFilter = {
          $expr: {
            $gte: [
              { $dateFromString: { dateString: "$runMetadata.startedAt" } },
              new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            ],
          },
        }
        break
      case "30d":
        timeFilter = {
          $expr: {
            $gte: [
              { $dateFromString: { dateString: "$runMetadata.startedAt" } },
              new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            ],
          },
        }
        break
      default:
        timeFilter = {}
    }

    const filter: Record<string, unknown> = {
      type: "run",
      "runMetadata.status": "success",
      ...timeFilter,
    }

    if (connectionId) {
      filter.connectionId = connectionId
    }

    const runsWithData = (await db
      .collection(CollectionManager.getCollectionName("DATA"))
      .find(filter, {
        projection: {
          _id: 1,
          connectionId: 1,
          "runMetadata.startedAt": 1,
          "runMetadata.completedAt": 1,
          "runMetadata.status": 1,
          "runMetadata.recordsExtracted": 1,
          dataPreview: 1,
          data: 1,
          "runMetadata.duration": 1,
        },
      })
      .sort({ "runMetadata.startedAt": -1 })
      .skip(skip)
      .limit(limit)
      .toArray()) as RunData[]

    const totalRuns = await db.collection(CollectionManager.getCollectionName("DATA")).countDocuments(filter)

    const processedData: Array<Record<string, unknown>> = []
    let totalRecords = 0
    let totalDataSize = 0

    for (const run of runsWithData) {
      const runData: Record<string, unknown> = {
        runId: run._id,
        connectionId: run.connectionId,
        timestamp: run.runMetadata?.startedAt,
        executionTime: run.runMetadata?.duration || 0,
        recordsProcessed: run.runMetadata?.recordsExtracted || 0,
        status: run.runMetadata?.status,
      }

      if (run.dataPreview) {
        runData.dataPreview = Array.isArray(run.dataPreview) ? run.dataPreview.slice(0, 5) : run.dataPreview
      }

      if (format === "detailed" && run.data) {
        runData.transformedData = Array.isArray(run.data) ? run.data.slice(0, 10) : run.data
      }

      processedData.push(runData)
      totalRecords += run.runMetadata?.recordsExtracted || 0
      totalDataSize += JSON.stringify(run.data || {}).length
    }

    const dataStats = (await db
      .collection(CollectionManager.getCollectionName("DATA"))
      .aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalRuns: { $sum: 1 },
            totalRecords: { $sum: "$runMetadata.recordsExtracted" },
            avgExecutionTime: { $avg: "$runMetadata.duration" },
            avgRecordsPerRun: { $avg: "$runMetadata.recordsExtracted" },
            minExecutionTime: { $min: "$runMetadata.duration" },
            maxExecutionTime: { $max: "$runMetadata.duration" },
          },
        },
      ])
      .toArray()) as DataStats[]

    const connectionBreakdown = (await db
      .collection(CollectionManager.getCollectionName("DATA"))
      .aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$connectionId",
            runCount: { $sum: 1 },
            totalRecords: { $sum: "$runMetadata.recordsExtracted" },
            avgExecutionTime: { $avg: "$runMetadata.duration" },
            lastRun: { $max: "$runMetadata.startedAt" },
          },
        },
        { $sort: { runCount: -1 } },
        { $limit: 10 },
      ])
      .toArray()) as ConnectionBreakdown[]

    const result = {
      summary: {
        timeRange,
        totalRuns,
        currentPage: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(totalRuns / limit),
        recordsShown: processedData.length,
        totalRecords,
        estimatedDataSize: `${Math.round(totalDataSize / 1024)}KB`,
      },
      statistics: dataStats[0] || {
        totalRuns: 0,
        totalRecords: 0,
        avgExecutionTime: 0,
        avgRecordsPerRun: 0,
        minExecutionTime: 0,
        maxExecutionTime: 0,
      },
      connectionBreakdown: connectionBreakdown.map((conn) => ({
        connectionId: conn._id,
        runCount: conn.runCount,
        totalRecords: conn.totalRecords || 0,
        avgExecutionTime: Math.round(conn.avgExecutionTime || 0),
        lastRun: conn.lastRun,
      })),
      data: processedData,
      metadata: {
        generatedAt: new Date().toISOString(),
        format,
        filters: {
          connectionId: connectionId || "all",
          timeRange,
          status: "success",
        },
      },
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Error fetching data:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
