import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"
import { getCachedAnalytics, CacheKeys, CacheTTL } from "@/lib/analytics-cache"

// Analytics API for success rate history - optimized for monitoring dashboards
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const connectionId = searchParams.get('connection_id')

    console.log("[v0] Fetching success rate history analytics with caching")

    // Create cache key based on query parameters
    const cacheKey = `success_rate_history:${days}:${connectionId || 'all'}`

    const analyticsData = await getCachedAnalytics(
      cacheKey,
      async () => await fetchSuccessRateHistory({ days, connectionId }),
      { ttl: CacheTTL.FREQUENT } // 5 minutes cache
    )

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('[v0] Error fetching success rate history:', error)
    return NextResponse.json({ error: 'Failed to fetch success rate history' }, { status: 500 })
  }
}

// Extracted analytics logic for caching
async function fetchSuccessRateHistory(params: {
  days: number
  connectionId: string | null
}) {
  const { days, connectionId } = params

  const db = await getDb()
  const collection = db.collection('api_data')

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Build match conditions
  const matchConditions: any = {
    type: 'run',
    _insertedAt: {
      $gte: startDate.toISOString(),
      $lte: endDate.toISOString()
    }
  }

  if (connectionId) {
    matchConditions.connectionId = connectionId
  }

  // Aggregate success rate by day
  const pipeline = [
    { $match: matchConditions },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $dateFromString: { dateString: '$_insertedAt' } }
          }
        },
        totalRuns: { $sum: 1 },
        successfulRuns: {
          $sum: {
            $cond: [
              { $eq: ['$runMetadata.status', 'success'] },
              1,
              0
            ]
          }
        },
        failedRuns: {
          $sum: {
            $cond: [
              { $eq: ['$runMetadata.status', 'failed'] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        date: '$_id',
        totalRuns: 1,
        successfulRuns: 1,
        failedRuns: 1,
        successRate: {
          $cond: [
            { $gt: ['$totalRuns', 0] },
            { $multiply: [{ $divide: ['$successfulRuns', '$totalRuns'] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: { date: 1 } }
  ]

  const results = await collection.aggregate(pipeline).toArray()

  // Fill in missing dates with zero values
  const filledResults = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const existingData = results.find(r => r.date === dateStr)

    if (existingData) {
      filledResults.push(existingData)
    } else {
      filledResults.push({
        date: dateStr,
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        successRate: 0
      })
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return {
    period: `${days} days`,
    connectionId: connectionId || 'all',
    data: filledResults,
    summary: {
      totalRuns: filledResults.reduce((sum, day) => sum + day.totalRuns, 0),
      totalSuccessful: filledResults.reduce((sum, day) => sum + day.successfulRuns, 0),
      totalFailed: filledResults.reduce((sum, day) => sum + day.failedRuns, 0),
      averageSuccessRate: filledResults.length > 0
        ? filledResults.reduce((sum, day) => sum + day.successRate, 0) / filledResults.length
        : 0
    }
  }
}
