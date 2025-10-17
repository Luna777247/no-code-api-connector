import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"

// DELETE /api/data/[id] - Delete specific run data or cleanup old data
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    console.log(`[v0] Deleting data with ID: ${id}`)

    const { searchParams } = new URL(request.url)
    const force = searchParams.get("force") === "true"
    const cleanupMode = searchParams.get("cleanup") // "old", "failed", "all"

    const db = await getDb()

    // Handle cleanup operations
    if (cleanupMode) {
      console.log(`[v0] Performing cleanup operation: ${cleanupMode}`)
      
      let deleteFilter: any = {}
      let operationDescription = ""

      switch (cleanupMode) {
        case "old":
          // Delete runs older than 30 days
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          deleteFilter = { startedAt: { $lt: thirtyDaysAgo } }
          operationDescription = "runs older than 30 days"
          break

        case "failed":
          // Delete failed runs older than 7 days
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          deleteFilter = { 
            status: { $in: ["failed", "error", "cancelled"] },
            startedAt: { $lt: sevenDaysAgo }
          }
          operationDescription = "failed runs older than 7 days"
          break

        case "all":
          if (!force) {
            return NextResponse.json({ 
              error: "Force parameter required for full cleanup",
              message: "Add ?force=true to confirm deletion of all data"
            }, { status: 400 })
          }
          deleteFilter = {}
          operationDescription = "all run data"
          break

        default:
          return NextResponse.json({ 
            error: "Invalid cleanup mode",
            validModes: ["old", "failed", "all"]
          }, { status: 400 })
      }

      // Count records to be deleted
      const deleteCount = await db.collection('api_runs').countDocuments(deleteFilter)
      
      if (deleteCount === 0) {
        return NextResponse.json({
          success: true,
          message: `No records found matching cleanup criteria: ${operationDescription}`,
          deletedCount: 0,
          timestamp: new Date().toISOString()
        })
      }

      // Perform the deletion
      const deleteResult = await db.collection('api_runs').deleteMany(deleteFilter)

      console.log(`[v0] Cleanup completed: deleted ${deleteResult.deletedCount} records`)
      
      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${operationDescription}`,
        deletedCount: deleteResult.deletedCount,
        operation: cleanupMode,
        timestamp: new Date().toISOString()
      })
    }

    // Handle single record deletion
    if (!id || id === "cleanup") {
      return NextResponse.json({ 
        error: "Run ID is required for single record deletion"
      }, { status: 400 })
    }

    // Check if the run exists and get its details first
    const existingRun = await db.collection('api_runs').findOne({ id: id })
    
    if (!existingRun) {
      return NextResponse.json({ 
        error: "Run not found",
        runId: id
      }, { status: 404 })
    }

    // Check if run is currently active
    if (existingRun.status === "running" && !force) {
      return NextResponse.json({ 
        error: "Cannot delete active run",
        message: "Use ?force=true to force deletion of running jobs",
        runId: id,
        status: existingRun.status
      }, { status: 409 })
    }

    // Perform the deletion
    const deleteResult = await db.collection('api_runs').deleteOne({ id: id })

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ 
        error: "Failed to delete run",
        runId: id
      }, { status: 500 })
    }

    console.log(`[v0] Successfully deleted run: ${id}`)
    
    return NextResponse.json({
      success: true,
      message: "Run data deleted successfully",
      deletedRun: {
        id: id,
        connectionId: existingRun.connectionId,
        status: existingRun.status,
        startedAt: existingRun.startedAt,
        recordsProcessed: existingRun.recordsProcessed || 0
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[v0] Error deleting data:", error)
    return NextResponse.json({ 
      error: "Failed to delete data",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}