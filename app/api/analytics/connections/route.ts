import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"

// Analytics API for connection metrics - performance and health data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'daily' // daily, hourly, weekly
    const days = parseInt(searchParams.get('days') || '30')

    console.log("[v0] Fetching connections metrics")

    const db = await getDb()
    const collection = db.collection('api_data_transformed')

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Determine grouping format based on period
    let dateFormat = "%Y-%m-%d"
    let groupByPeriod = "day"
    
    if (period === 'hourly') {
      dateFormat = "%Y-%m-%d %H:00"
      groupByPeriod = "hour"
    } else if (period === 'weekly') {
      dateFormat = "%Y-W%U" 
      groupByPeriod = "week"
    }

    // Aggregation pipeline for connection performance metrics
    const pipeline = [
      {
        $match: {
          _insertedAt: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            connectionId: "$_connectionId",
            period: { 
              $dateToString: { 
                format: dateFormat, 
                date: "$_insertedAt" 
              } 
            }
          },
          recordCount: { $sum: 1 },
          firstRecord: { $min: "$_insertedAt" },
          lastRecord: { $max: "$_insertedAt" },
          // Calculate data quality metrics
          fieldCount: { $sum: { $size: { $objectToArray: "$$ROOT" } } },
          avgFieldCount: { $avg: { $size: { $objectToArray: "$$ROOT" } } }
        }
      },
      {
        $project: {
          _id: 0,
          connectionId: "$_id.connectionId",
          period: "$_id.period",
          recordCount: 1,
          firstRecord: 1,
          lastRecord: 1,
          avgFieldCount: { $round: ["$avgFieldCount", 2] },
          processingDuration: {
            $divide: [
              { $subtract: ["$lastRecord", "$firstRecord"] },
              1000 // Convert to seconds
            ]
          },
          recordsPerSecond: {
            $cond: {
              if: { $gt: [{ $subtract: ["$lastRecord", "$firstRecord"] }, 0] },
              then: {
                $divide: [
                  "$recordCount",
                  { $divide: [{ $subtract: ["$lastRecord", "$firstRecord"] }, 1000] }
                ]
              },
              else: 0
            }
          }
        }
      },
      { $sort: { period: -1, connectionId: 1 } }
    ]

    const metrics = await collection.aggregate(pipeline).toArray()

    // Get overall connection health summary
    const healthPipeline = [
      {
        $match: {
          _insertedAt: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: "$_connectionId",
          totalRecords: { $sum: 1 },
          firstSeen: { $min: "$_insertedAt" },
          lastSeen: { $max: "$_insertedAt" },
          daysWithData: {
            $addToSet: {
              $dateToString: { format: "%Y-%m-%d", date: "$_insertedAt" }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          connectionId: "$_id", 
          totalRecords: 1,
          firstSeen: 1,
          lastSeen: 1,
          activeDays: { $size: "$daysWithData" },
          avgRecordsPerDay: {
            $divide: ["$totalRecords", { $size: "$daysWithData" }]
          },
          daysSinceLastData: {
            $divide: [
              { $subtract: [new Date(), "$lastSeen"] },
              1000 * 60 * 60 * 24
            ]
          },
          healthStatus: {
            $switch: {
              branches: [
                {
                  case: { 
                    $lt: [
                      { $divide: [{ $subtract: [new Date(), "$lastSeen"] }, 1000 * 60 * 60 * 24] },
                      1
                    ]
                  },
                  then: "healthy"
                },
                {
                  case: {
                    $lt: [
                      { $divide: [{ $subtract: [new Date(), "$lastSeen"] }, 1000 * 60 * 60 * 24] },
                      7
                    ]
                  },
                  then: "warning"
                }
              ],
              default: "error"
            }
          }
        }
      },
      { $sort: { totalRecords: -1 } }
    ]

    const health = await collection.aggregate(healthPipeline).toArray()

    // Calculate system-wide metrics
    const systemMetrics = {
      totalConnections: health.length,
      healthyConnections: health.filter(h => h.healthStatus === 'healthy').length,
      warningConnections: health.filter(h => h.healthStatus === 'warning').length,
      errorConnections: health.filter(h => h.healthStatus === 'error').length,
      totalRecords: health.reduce((sum, h) => sum + h.totalRecords, 0),
      avgRecordsPerConnection: health.length > 0 
        ? Math.round(health.reduce((sum, h) => sum + h.totalRecords, 0) / health.length)
        : 0
    }

    const response = {
      metrics,
      health,
      systemMetrics,
      metadata: {
        period,
        days,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        generatedAt: new Date().toISOString()
      }
    }

    console.log(`[v0] Retrieved metrics for ${health.length} connections`)
    return NextResponse.json(response)

  } catch (error) {
    console.error("[v0] Error fetching connection metrics:", error)
    return NextResponse.json(
      { error: "Failed to fetch connection metrics" },
      { status: 500 }
    )
  }
}