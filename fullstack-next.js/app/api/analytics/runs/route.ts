import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"
import { getCachedAnalytics, CacheKeys, CacheTTL } from "@/lib/analytics-cache"

// Analytics API for ETL runs summary - optimized for Metabase dashboards
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date') 
    const connectionId = searchParams.get('connection_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')

    console.log("[v0] Fetching ETL runs analytics with caching")

    // Create cache key based on query parameters
    const cacheKey = `${CacheKeys.RUNS_SUMMARY}:${startDate || 'all'}:${endDate || 'all'}:${connectionId || 'all'}:${status || 'all'}:${limit}`

    const analyticsData = await getCachedAnalytics(
      cacheKey,
      async () => await fetchRunsAnalytics({ startDate, endDate, connectionId, status, limit }),
      { ttl: CacheTTL.FREQUENT } // 5 minutes cache
    )

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('[v0] Error fetching runs analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch runs analytics' }, { status: 500 })
  }
}

// Extracted analytics logic for caching
async function fetchRunsAnalytics(params: {
  startDate: string | null
  endDate: string | null  
  connectionId: string | null
  status: string | null
  limit: number
}) {
  const { startDate, endDate, connectionId, status, limit } = params
  
  const db = await getDb()
  const collection = db.collection('api_data_transformed')

  // Build query filters
  const filters: any = {}
  
  if (startDate || endDate) {
    filters._insertedAt = {}
    if (startDate) filters._insertedAt.$gte = new Date(startDate)
    if (endDate) filters._insertedAt.$lte = new Date(endDate)
  }
  
  if (connectionId) {
    filters._connectionId = connectionId
  }

  // Aggregation pipeline for ETL runs summary
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: {
          connectionId: "$_connectionId",
          date: { 
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: "$_insertedAt" 
            } 
          }
        },
        totalRecords: { $sum: 1 },
        firstRecord: { $min: "$_insertedAt" },
        lastRecord: { $max: "$_insertedAt" },
        sampleData: { $first: "$$ROOT" }
      }
    },
    {
      $project: {
        _id: 0,
        connectionId: "$_id.connectionId",
        date: "$_id.date", 
        totalRecords: 1,
        firstRecord: 1,
        lastRecord: 1,
        duration: {
          $subtract: ["$lastRecord", "$firstRecord"]
        },
        sampleFields: { $objectToArray: "$sampleData" }
      }
    },
    { $sort: { date: -1, connectionId: 1 } },
    { $limit: limit }
  ]

  const runs = await collection.aggregate(pipeline).toArray()

  // Get connection summary statistics
  const summaryPipeline = [
    { $match: filters },
    {
      $group: {
        _id: "$_connectionId",
        totalRecords: { $sum: 1 },
        firstSeen: { $min: "$_insertedAt" },
        lastSeen: { $max: "$_insertedAt" },
        avgRecordsPerDay: { $avg: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        connectionId: "$_id",
        totalRecords: 1,
        firstSeen: 1,
        lastSeen: 1,
        daysActive: {
          $ceil: {
            $divide: [
              { $subtract: ["$lastSeen", "$firstSeen"] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      }
    }
  ]

  const summary = await collection.aggregate(summaryPipeline).toArray()

  const response = {
    runs,
    summary,
    metadata: {
      totalRuns: runs.length,
      dateRange: {
        start: startDate,
        end: endDate
      },
      filters: {
        connectionId,
        status
      },
      generatedAt: new Date().toISOString(),
      cached: false
    }
  }

  console.log(`[v0] Retrieved ${runs.length} ETL run records`)
  return response
}