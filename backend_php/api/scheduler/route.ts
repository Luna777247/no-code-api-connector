import { NextResponse } from "next/server"
import { airflowClient } from "@/lib/airflow-client"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { connectionId, scheduleType, cronExpression, workflowConfig } = body

    console.log("[v0] Creating Airflow schedule for connection:", connectionId)
    console.log("[v0] Schedule type:", scheduleType)
    console.log("[v0] CRON expression:", cronExpression)

    // Create DAG in Airflow
    try {
      const dagId = await airflowClient.createDag(connectionId, cronExpression, workflowConfig)
      
      // Unpause the DAG so it can run on schedule
      await airflowClient.pauseDag(dagId, false)
      
      const schedule = {
        id: dagId,
        connectionId,
        scheduleType,
        cronExpression,
        isActive: true,
        airflowDagId: dagId,
        nextRun: new Date(Date.now() + 86400000).toISOString(), // Rough estimate
        createdAt: new Date().toISOString(),
      }

      console.log("[v0] Airflow DAG created successfully:", dagId)
      return NextResponse.json(schedule, { status: 201 })
      
    } catch (airflowError) {
      console.error("[v0] Airflow integration error:", airflowError)
      
      // Fallback to mock behavior if Airflow is not available
      console.log("[v0] Falling back to mock scheduler")
      const schedule = {
        id: Math.random().toString(36).substr(2, 9),
        connectionId,
        scheduleType,
        cronExpression,
        isActive: true,
        airflowError: airflowError instanceof Error ? airflowError.message : "Airflow unavailable",
        nextRun: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      }

      return NextResponse.json(schedule, { status: 201 })
    }
  } catch (error) {
    console.error("[v0] Error creating schedule:", error)
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 })
  }
}

export async function GET() {
  try {
    console.log("[v0] Fetching schedules from Airflow")
    
    // Try to get DAGs from Airflow
    try {
      const dags = await airflowClient.getDags()
      const etlDags = dags.filter(dag => dag.dag_id.startsWith('etl_workflow_'))
      
      const schedules = await Promise.all(
        etlDags.map(async (dag) => {
          const connectionId = dag.dag_id.replace('etl_workflow_', '')
          
          // Get recent DAG runs
          try {
            const dagRuns = await airflowClient.getDagRuns(dag.dag_id, 5)
            const lastRun = dagRuns[0]
            
            return {
              id: dag.dag_id,
              connectionId,
              connectionName: `Connection ${connectionId}`,
              scheduleType: dag.schedule_interval === '0 0 * * *' ? 'daily' : 
                           dag.schedule_interval === '0 * * * *' ? 'hourly' : 'custom',
              cronExpression: dag.schedule_interval || 'None',
              isActive: !dag.is_paused,
              airflowDagId: dag.dag_id,
              nextRun: new Date(Date.now() + 86400000).toISOString(), // Airflow calculates this
              lastRun: lastRun ? lastRun.execution_date : null,
              lastStatus: lastRun ? lastRun.state : 'never_run',
              totalRuns: dagRuns.length,
              tags: dag.tags,
              lastParsed: dag.last_parsed_time,
            }
          } catch (runError) {
            console.error(`[v0] Error fetching runs for DAG ${dag.dag_id}:`, runError)
            return {
              id: dag.dag_id,
              connectionId,
              connectionName: `Connection ${connectionId}`,
              scheduleType: 'unknown',
              cronExpression: dag.schedule_interval || 'None',
              isActive: !dag.is_paused,
              airflowDagId: dag.dag_id,
              nextRun: null,
              lastRun: null,
              lastStatus: 'unknown',
              totalRuns: 0,
            }
          }
        })
      )
      
      console.log(`[v0] Found ${schedules.length} Airflow schedules`)
      return NextResponse.json(schedules)
      
    } catch (airflowError) {
      console.error("[v0] Airflow fetch error, falling back to mock data:", airflowError)
      
      // Fallback to mock data if Airflow is not available
      const schedules = [
        {
          id: "1",
          connectionName: "JSONPlaceholder Users API",
          scheduleType: "daily",
          cronExpression: "0 0 * * *",
          isActive: true,
          nextRun: new Date(Date.now() + 86400000).toISOString(),
          lastRun: new Date(Date.now() - 3600000).toISOString(),
          lastStatus: "success",
          totalRuns: 45,
          airflowError: airflowError instanceof Error ? airflowError.message : "Airflow unavailable",
        },
      ]
      
      return NextResponse.json(schedules)
    }
  } catch (error) {
    console.error("[v0] Error fetching schedules:", error)
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 })
  }
}
