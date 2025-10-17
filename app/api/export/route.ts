// API Route: Data Export
import { NextRequest, NextResponse } from "next/server"
import { DataExporter } from "@/lib/data-exporter"
import { AuditLogger } from "@/lib/audit-logger"

// POST /api/export - Export data to various formats
export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Processing data export request")

    const body = await request.json()
    const {
      connectionId,
      runId,
      format = 'json',
      includeHeaders = true,
      delimiter = ',',
      pretty = false,
      fields,
      limit,
      filter
    } = body

    if (!connectionId && !runId) {
      return NextResponse.json(
        { error: "Either connectionId or runId is required" },
        { status: 400 }
      )
    }

    const config = {
      format,
      includeHeaders,
      delimiter,
      pretty,
      fields,
      limit,
      filter
    }

    // Export data
    const result = runId
      ? await DataExporter.exportRunData(runId, config)
      : await DataExporter.exportConnectionData(connectionId, config)

    // Log audit event
    await AuditLogger.logDataAccess(
      'exported',
      connectionId || runId,
      undefined, // TODO: Get userId from auth
      {
        format,
        recordCount: result.recordCount,
        fileSize: result.size
      }
    )

    console.log(`[v0] Data export completed: ${result.fileName}`)

    // Return file as download
    const headers = new Headers()
    headers.set('Content-Type', format === 'json' ? 'application/json' : 'text/csv')
    headers.set('Content-Disposition', `attachment; filename="${result.fileName}"`)
    headers.set('Content-Length', result.size.toString())

    const content = typeof result.content === 'string' 
      ? result.content 
      : Buffer.from(result.content).toString()

    return new NextResponse(content, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error("[v0] Error exporting data:", error)
    
    await AuditLogger.logError(
      'error.occurred',
      'Data export failed',
      'data',
      'unknown',
      error instanceof Error ? error.message : String(error)
    )

    return NextResponse.json(
      { 
        error: "Failed to export data",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// GET /api/export - Get export history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    console.log("[v0] Fetching export history")

    const history = await DataExporter.getExportHistory(connectionId, limit)

    return NextResponse.json({
      exports: history,
      total: history.length
    })
  } catch (error) {
    console.error("[v0] Error fetching export history:", error)
    return NextResponse.json(
      { error: "Failed to fetch export history" },
      { status: 500 }
    )
  }
}
