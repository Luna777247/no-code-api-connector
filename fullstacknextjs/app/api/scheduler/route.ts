import { NextResponse } from "next/server"
import { airflowClient } from "@/lib/airflow-client"
import { getDb } from "@/lib/mongo"
import { CollectionManager } from "@/lib/database-schema"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { connectionId, scheduleType, cronExpression, workflowConfig } = body

    if (!connectionId || !scheduleType || !cronExpression) {
      return NextResponse.json(
        {
          error: "Missing required fields: connectionId, scheduleType, cronExpression",
        },
        { status: 400 },
      )
    }

    const cronRegex =
      /^(\*|([0-9]|[1-5][0-9])|(\*\/[0-9]+)|([0-9]+-[0-9]+)|([0-9]+(,[0-9]+)*)) (\*|([0-9]|1[0-9]|2[0-3])|(\*\/[0-9]+)|([0-9]+-[0-9]+)|([0-9]+(,[0-9]+)*)) (\*|([1-9]|[12][0-9]|3[01])|(\*\/[0-9]+)|([0-9]+-[0-9]+)|([0-9]+(,[0-9]+)*)) (\*|([1-9]|1[0-2])|(\*\/[0-9]+)|([0-9]+-[0-9]+)|([0-9]+(,[0-9]+)*)) (\*|([0-7])|(\*\/[0-9]+)|([0-9]+-[0-9]+)|([0-9]+(,[0-9]+)*))$/
    if (!cronRegex.test(cronExpression)) {
      return NextResponse.json(
        {
          error: "Invalid cron expression format",
        },
        { status: 400 },
      )
    }

    const db = await getDb()
    const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const schedule = {
      scheduleId,
      connectionId,
      connectionName: `Connection ${connectionId}`,
      scheduleType,
      cronExpression,
      isActive: true,
      nextRun: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workflowConfig: workflowConfig || {},
    }

    await db.collection("api_schedules").insertOne(schedule)

    try {
      const dagId = await airflowClient.createDag(connectionId, cronExpression, workflowConfig)
      await airflowClient.pauseDag(dagId, false)

      await db.collection("api_schedules").updateOne(
        { scheduleId },
        {
          $set: {
            airflowDagId: dagId,
            updatedAt: new Date().toISOString(),
          },
        },
      )

      return NextResponse.json({ ...schedule, airflowDagId: dagId }, { status: 201 })
    } catch (airflowError) {
      await db.collection("api_schedules").updateOne(
        { scheduleId },
        {
          $set: {
            airflowError: airflowError instanceof Error ? airflowError.message : "Airflow unavailable",
            updatedAt: new Date().toISOString(),
          },
        },
      )

      return NextResponse.json(
        {
          ...schedule,
          airflowError: airflowError instanceof Error ? airflowError.message : "Airflow unavailable",
        },
        { status: 201 },
      )
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const db = await getDb()
    const schedules = await db.collection("api_schedules").find({}).toArray()

    const enrichedSchedules = await Promise.all(
      schedules.map(async (schedule) => {
        const totalRuns = await db.collection(CollectionManager.getCollectionName("DATA")).countDocuments({
          type: "run",
          scheduleId: schedule.scheduleId,
        })

        const lastRun = await db
          .collection(CollectionManager.getCollectionName("DATA"))
          .find({
            type: "run",
            scheduleId: schedule.scheduleId,
          })
          .sort({ "runMetadata.startedAt": -1 })
          .limit(1)
          .toArray()

        return {
          ...schedule,
          totalRuns,
          lastRun: lastRun[0]?.runMetadata?.startedAt || null,
          lastStatus: lastRun[0]?.runMetadata?.status || "never_run",
          lastDuration: lastRun[0]?.runMetadata?.duration || null,
          nextRun: schedule.nextRun || null,
          connectionName: schedule.connectionName || `Connection ${schedule.connectionId}`,
        }
      }),
    )

    return NextResponse.json(enrichedSchedules)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 })
  }
}
