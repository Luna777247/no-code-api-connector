import { NextResponse } from "next/server"
import { airflowClient } from "@/lib/airflow-client"
import { getDb } from "@/lib/mongo"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { connectionId, scheduleType, cronExpression, workflowConfig } = body

    // Validate required fields
    if (!connectionId || !scheduleType || !cronExpression) {
      return NextResponse.json({
        error: "Missing required fields: connectionId, scheduleType, cronExpression"
      }, { status: 400 })
    }

    // Basic cron expression validation
    const cronRegex = /^(\*|([0-9]|[1-5][0-9])|(\*\/[0-9]+)|([0-9]+-[0-9]+)|([0-9]+(,[0-9]+)*)) (\*|([0-9]|1[0-9]|2[0-3])|(\*\/[0-9]+)|([0-9]+-[0-9]+)|([0-9]+(,[0-9]+)*)) (\*|([1-9]|[12][0-9]|3[01])|(\*\/[0-9]+)|([0-9]+-[0-9]+)|([0-9]+(,[0-9]+)*)) (\*|([1-9]|1[0-2])|(\*\/[0-9]+)|([0-9]+-[0-9]+)|([0-9]+(,[0-9]+)*)) (\*|([0-7])|(\*\/[0-9]+)|([0-9]+-[0-9]+)|([0-9]+(,[0-9]+)*))$/
    if (!cronRegex.test(cronExpression)) {
      return NextResponse.json({
        error: "Invalid cron expression format"
      }, { status: 400 })
    }

    console.log("[v0] Creating Airflow schedule for connection:", connectionId)
    console.log("[v0] Schedule type:", scheduleType)
    console.log("[v0] CRON expression:", cronExpression)

    // Try to save to database
    const db = await getDb()
    const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const schedule = {
      scheduleId,
      connectionId,
      connectionName: `Connection ${connectionId}`,
      scheduleType,
      cronExpression,
      isActive: true,
      nextRun: new Date(Date.now() + 86400000).toISOString(), // Next day
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workflowConfig: workflowConfig || {},
    }

    await db.collection('api_schedules').insertOne(schedule)
    console.log("[v0] Schedule saved to database:", scheduleId)

    // Try Airflow integration
    try {
      const dagId = await airflowClient.createDag(connectionId, cronExpression, workflowConfig)
      await airflowClient.pauseDag(dagId, false)

      // Update with Airflow info
      await db.collection('api_schedules').updateOne(
        { scheduleId },
        {
          $set: {
            airflowDagId: dagId,
            updatedAt: new Date().toISOString()
          }
        }
      )

      console.log("[v0] Airflow DAG created successfully:", dagId)
      return NextResponse.json({ ...schedule, airflowDagId: dagId }, { status: 201 })

    } catch (airflowError) {
      console.error("[v0] Airflow integration error:", airflowError)

      // Update with Airflow error but keep schedule
      await db.collection('api_schedules').updateOne(
        { scheduleId },
        {
          $set: {
            airflowError: airflowError instanceof Error ? airflowError.message : "Airflow unavailable",
            updatedAt: new Date().toISOString()
          }
        }
      )

      return NextResponse.json({
        ...schedule,
        airflowError: airflowError instanceof Error ? airflowError.message : "Airflow unavailable"
      }, { status: 201 })
    }
  } catch (error) {
    console.error("[v0] Error creating schedule:", error)
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Try to get schedules from database
    const db = await getDb()
    const schedules = await db.collection('api_schedules').find({}).toArray()

    // Return database schedules with enriched data
    const enrichedSchedules = await Promise.all(
      schedules.map(async (schedule) => {
        // Count total runs for this schedule
        const totalRuns = await db.collection('api_runs').countDocuments({
          scheduleId: schedule.scheduleId
        })

        // Get last run info
        const lastRun = await db.collection('api_runs')
          .find({ scheduleId: schedule.scheduleId })
          .sort({ createdAt: -1 })
          .limit(1)
          .toArray()

        return {
          ...schedule,
          totalRuns,
          lastRun: lastRun[0]?.createdAt || null,
          lastStatus: lastRun[0]?.status || 'never_run',
          nextRun: schedule.nextRun || null,
          connectionName: schedule.connectionName || `Connection ${schedule.connectionId}`,
        }
      })
    )

    console.log(`[v0] Found ${enrichedSchedules.length} database schedules`)
    return NextResponse.json(enrichedSchedules)

  } catch (error) {
    console.error("[v0] Error fetching schedules from database:", error)
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 })
  }
}