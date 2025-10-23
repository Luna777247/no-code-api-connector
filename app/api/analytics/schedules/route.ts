import { NextResponse } from "next/server"
import { airflowClient } from "@/lib/airflow-client"
import { getDb } from "@/lib/mongo"

// Analytics API for Airflow scheduling metrics and performance
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    console.log("[v0] Fetching Airflow scheduling analytics")

    // Get Airflow DAGs and runs
    let airflowData = null
    let airflowError = null

    try {
      const dags = await airflowClient.getDags()
      const etlDags = dags.filter(dag => dag.dag_id.startsWith('etl_workflow_'))
      
      if (etlDags.length === 0) {
        throw new Error('No ETL DAGs found in Airflow')
      }
      
      // Get DAG runs for each ETL DAG
      const dagRunsPromises = etlDags.map(async (dag) => {
        try {
          const runs = await airflowClient.getDagRuns(dag.dag_id, 20)
          return {
            dagId: dag.dag_id,
            connectionId: dag.dag_id.replace('etl_workflow_', ''),
            scheduleInterval: dag.schedule_interval,
            isPaused: dag.is_paused,
            runs: runs.map(run => ({
              runId: run.dag_run_id,
              executionDate: run.execution_date,
              startDate: run.start_date,
              endDate: run.end_date,
              state: run.state,
              duration: run.end_date && run.start_date 
                ? new Date(run.end_date).getTime() - new Date(run.start_date).getTime()
                : null
            }))
          }
        } catch (error) {
          console.error(`[v0] Error fetching runs for DAG ${dag.dag_id}:`, error)
          return {
            dagId: dag.dag_id,
            connectionId: dag.dag_id.replace('etl_workflow_', ''),
            scheduleInterval: dag.schedule_interval,
            isPaused: dag.is_paused,
            runs: [],
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })

      const dagRuns = await Promise.all(dagRunsPromises)
      
      airflowData = {
        totalDags: etlDags.length,
        activeDags: etlDags.filter(dag => !dag.is_paused).length,
        pausedDags: etlDags.filter(dag => dag.is_paused).length,
        dags: dagRuns
      }

    } catch (error) {
      console.error("[v0] Airflow API error:", error)
      airflowError = error instanceof Error ? error.message : 'Airflow unavailable'
    }

    // Get MongoDB ETL performance data
    const db = await getDb()
    const collection = db.collection('api_data_transformed')

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Analyze ETL performance by connection
    const performancePipeline = [
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
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$_insertedAt" }
            }
          },
          recordCount: { $sum: 1 },
          minTime: { $min: "$_insertedAt" },
          maxTime: { $max: "$_insertedAt" }
        }
      },
      {
        $group: {
          _id: "$_id.connectionId",
          dailyStats: {
            $push: {
              date: "$_id.date",
              recordCount: "$recordCount",
              minTime: "$minTime",
              maxTime: "$maxTime",
              duration: { $subtract: ["$maxTime", "$minTime"] }
            }
          },
          totalRecords: { $sum: "$recordCount" },
          avgRecordsPerDay: { $avg: "$recordCount" },
          activeDays: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          connectionId: "$_id",
          totalRecords: 1,
          avgRecordsPerDay: { $round: ["$avgRecordsPerDay", 2] },
          activeDays: 1,
          dailyStats: 1,
          consistency: {
            $divide: ["$activeDays", days]
          }
        }
      },
      { $sort: { totalRecords: -1 } }
    ]

    const performance = await collection.aggregate(performancePipeline).toArray()

    // Calculate schedule adherence (if Airflow data is available)
    let scheduleAdherence = null
    if (airflowData) {
      scheduleAdherence = airflowData.dags.map(dag => {
        const successfulRuns = dag.runs.filter(run => run.state === 'success').length
        const totalRuns = dag.runs.length
        const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0

        return {
          connectionId: dag.connectionId,
          dagId: dag.dagId,
          scheduleInterval: dag.scheduleInterval,
          isPaused: dag.isPaused,
          totalRuns: totalRuns,
          successfulRuns: successfulRuns,
          failedRuns: dag.runs.filter(run => run.state === 'failed').length,
          successRate: Math.round(successRate * 100) / 100,
          avgDuration: dag.runs
            .filter(run => run.duration)
            .reduce((sum, run, _, arr) => sum + (run.duration || 0) / arr.length, 0),
          lastRunDate: dag.runs.length > 0 ? dag.runs[0].executionDate : null
        }
      })
    }

    const response = {
      airflow: airflowData,
      performance,
      scheduleAdherence,
      metadata: {
        days,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        airflowAvailable: !airflowError,
        airflowError,
        generatedAt: new Date().toISOString()
      }
    }

    console.log(`[v0] Retrieved scheduling analytics for ${performance.length} connections`)
    return NextResponse.json(response)

  } catch (error) {
    console.error("[v0] Error fetching scheduling analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch scheduling analytics" },
      { status: 500 }
    )
  }
}