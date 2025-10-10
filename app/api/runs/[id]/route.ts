import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"

// GET /api/runs/:id - Lấy chi tiết run cụ thể
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const runId = resolvedParams.id
    console.log("[v0] Fetching run:", runId)

    const db = await getDb()
    const run = await db.collection('api_runs').findOne({ runId: runId })

    if (!run) {
      // Mock data for development
      const mockRun = {
        id: runId,
        connectionId: "conn_123",
        connectionName: "JSONPlaceholder Users API", 
        status: "success",
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 3000000).toISOString(),
        duration: 600000, // 10 minutes in ms
        durationDisplay: "10m 0s",
        totalRequests: 10,
        successfulRequests: 10,
        failedRequests: 0,
        recordsExtracted: 100,
        recordsLoaded: 100,
        errorMessage: null,
        logs: [
          { timestamp: new Date(Date.now() - 3600000).toISOString(), level: "info", message: "Starting ETL process" },
          { timestamp: new Date(Date.now() - 3550000).toISOString(), level: "info", message: "Connecting to API endpoint" },
          { timestamp: new Date(Date.now() - 3500000).toISOString(), level: "info", message: "Processing 100 records" },
          { timestamp: new Date(Date.now() - 3000000).toISOString(), level: "info", message: "ETL process completed successfully" }
        ],
        metrics: {
          avgResponseTime: 250,
          minResponseTime: 150,
          maxResponseTime: 500,
          dataQualityScore: 98.5,
          transformationErrors: 0
        }
      }
      
      return NextResponse.json(mockRun)
    }

    return NextResponse.json(run)
  } catch (error) {
    console.error("[v0] Error fetching run:", error)
    return NextResponse.json({ error: "Failed to fetch run" }, { status: 500 })
  }
}

// DELETE /api/runs/:id - Xóa run history
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const runId = params.id
    console.log("[v0] Deleting run:", runId)

    const db = await getDb()
    
    // Check if run exists
    const run = await db.collection('api_runs').findOne({ runId: runId })
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 })
    }

    // Check if run is still active/running
    if (run.status === 'running') {
      return NextResponse.json({ 
        error: "Cannot delete running process. Stop the run first." 
      }, { status: 400 })
    }

    // Delete run and related data
    const deletePromises = [
      // Delete main run record
      db.collection('api_runs').deleteOne({ runId: runId }),
      
      // Delete run logs
      db.collection('api_run_logs').deleteMany({ runId: runId }),
      
      // Delete raw data from this run (optional - might want to keep for auditing)
      // db.collection('api_data_raw').deleteMany({ runId: runId }),
      
      // Delete transformed data from this run (optional)
      // db.collection('api_data_transformed').deleteMany({ runId: runId })
    ]

    const results = await Promise.all(deletePromises)
    
    console.log("[v0] Successfully deleted run and related data:", runId)
    return NextResponse.json({ 
      message: "Run deleted successfully",
      runId: runId,
      deletedRecords: {
        runs: results[0].deletedCount,
        logs: results[1].deletedCount
      }
    })
  } catch (error) {
    console.error("[v0] Error deleting run:", error)
    return NextResponse.json({ error: "Failed to delete run" }, { status: 500 })
  }
}
