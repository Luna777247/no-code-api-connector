// API Route: File Upload
import { NextRequest, NextResponse } from "next/server"
import { FileUploadHandler } from "@/lib/file-upload-handler"
import { AuditLogger } from "@/lib/audit-logger"

export const runtime = 'nodejs'

// POST /api/upload - Upload and process file
export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Processing file upload request")

    const formData = await request.formData()
    const file = formData.get('file') as File
    const connectionId = formData.get('connectionId') as string
    const fileType = formData.get('fileType') as 'csv' | 'json' | 'excel' | 'xml'
    const delimiter = formData.get('delimiter') as string | null
    const skipRows = formData.get('skipRows') ? parseInt(formData.get('skipRows') as string) : 0

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    if (!connectionId) {
      return NextResponse.json(
        { error: "Connection ID is required" },
        { status: 400 }
      )
    }

    // Get file content
    const buffer = await file.arrayBuffer()
    const content = fileType === 'csv' || fileType === 'json' 
      ? new TextDecoder().decode(buffer)
      : Buffer.from(buffer)

    // Process upload
    const result = await FileUploadHandler.processUpload(
      file.name,
      content,
      fileType || 'csv',
      connectionId,
      {
        fileType: fileType || 'csv',
        delimiter: delimiter || ',',
        skipRows
      }
    )

    // Log audit event
    await AuditLogger.logDataAccess(
      'accessed',
      result.uploadId,
      undefined, // TODO: Get userId from auth
      {
        fileName: file.name,
        fileSize: file.size,
        recordCount: result.recordCount
      }
    )

    console.log(`[v0] File upload completed: ${result.status}`)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Error processing file upload:", error)
    
    await AuditLogger.logError(
      'error.occurred',
      'File upload failed',
      'file',
      'unknown',
      error instanceof Error ? error.message : String(error)
    )

    return NextResponse.json(
      { 
        error: "Failed to process file upload",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// GET /api/upload - Get upload history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    console.log("[v0] Fetching upload history")

    const history = await FileUploadHandler.getUploadHistory(connectionId, limit)

    return NextResponse.json({
      uploads: history,
      total: history.length
    })
  } catch (error) {
    console.error("[v0] Error fetching upload history:", error)
    return NextResponse.json(
      { error: "Failed to fetch upload history" },
      { status: 500 }
    )
  }
}
