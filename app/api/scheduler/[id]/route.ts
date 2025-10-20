import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"
import { CollectionManager } from "@/lib/database-schema"

// GET /api/scheduler/:id - Lấy chi tiết schedule
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id
    console.log("[v0] Fetching schedule:", scheduleId)

    const db = await getDb()
    const schedule = await db.collection('api_schedules').findOne({ 
      scheduleId: scheduleId 
    })

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    return NextResponse.json(schedule)
  } catch (error) {
    console.error("[v0] Error fetching schedule:", error)
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 })
  }
}

// PUT /api/scheduler/:id - Cập nhật schedule
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id
    const updateData = await request.json()
    
    console.log("[v0] Updating schedule:", scheduleId, updateData)

    const db = await getDb()
    
    // Validate cron expression if provided
    if (updateData.cronExpression) {
      // Basic validation - in production use a proper cron parser
      const cronRegex = /^(\*|(?:\*\/)?[0-5]?\d) (\*|(?:\*\/)?(?:[01]?\d|2[0-3])) (\*|(?:\*\/)?(?:[12]?\d|3[01])) (\*|(?:\*\/)?(?:[1-9]|1[012])) (\*|(?:\*\/)?[0-7])$/
      if (!cronRegex.test(updateData.cronExpression)) {
        return NextResponse.json({ 
          error: "Invalid cron expression format" 
        }, { status: 400 })
      }
    }

    const result = await db.collection('api_schedules').updateOne(
      { scheduleId: scheduleId },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      // Create if not exists
      const newSchedule = {
        scheduleId: scheduleId,
        ...updateData,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await db.collection('api_schedules').insertOne(newSchedule)
      
      // TODO: Register with Airflow or job scheduler
      console.log("[v0] Created new schedule:", scheduleId)
      return NextResponse.json(newSchedule, { status: 201 })
    }

    // Fetch updated schedule
    const updatedSchedule = await db.collection('api_schedules').findOne({ 
      scheduleId: scheduleId 
    })

    // TODO: Update Airflow DAG if schedule changed
    console.log("[v0] Successfully updated schedule:", scheduleId)
    return NextResponse.json(updatedSchedule)
  } catch (error) {
    console.error("[v0] Error updating schedule:", error)
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 })
  }
}

// DELETE /api/scheduler/:id - Xóa schedule
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const scheduleId = params.id
    console.log("[v0] Deleting schedule:", scheduleId)

    const db = await getDb()
    
    // Check if schedule exists
    const schedule = await db.collection('api_schedules').findOne({ 
      scheduleId: scheduleId 
    })

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    // Check if there are active runs
    const activeRuns = await db.collection(CollectionManager.getCollectionName('DATA')).countDocuments({ 
      type: 'run',
      scheduleId: scheduleId,
      'runMetadata.status': 'running' 
    })

    if (activeRuns > 0) {
      return NextResponse.json({ 
        error: `Cannot delete schedule. ${activeRuns} active runs in progress.` 
      }, { status: 400 })
    }

    // Delete the schedule
    const deleteResult = await db.collection('api_schedules').deleteOne({ 
      scheduleId: scheduleId 
    })

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    // Get count of historical runs for this schedule
    const historicalRuns = await db.collection(CollectionManager.getCollectionName('DATA')).countDocuments({ 
      type: 'run',
      scheduleId: scheduleId 
    })

    // TODO: Remove from Airflow or job scheduler
    console.log("[v0] Successfully deleted schedule:", scheduleId)
    return NextResponse.json({ 
      message: "Schedule deleted successfully",
      scheduleId: scheduleId,
      historicalRuns: historicalRuns,
      warning: historicalRuns > 0 ? `${historicalRuns} historical runs preserved` : null
    })
  } catch (error) {
    console.error("[v0] Error deleting schedule:", error)
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 })
  }
}