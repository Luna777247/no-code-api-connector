import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"

// GET /api/runs - Lấy danh sách tất cả runs với phân trang và filter
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') // 'success', 'failed', 'running'
    const connectionId = searchParams.get('connectionId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    console.log("[v0] Fetching runs with filters:", { page, limit, status, connectionId, startDate, endDate })

    const db = await getDb()
    
    // Build filter query
    const filters: any = {}
    
    if (status) {
      filters.status = status
    }
    
    if (connectionId) {
      filters.connectionId = connectionId
    }
    
    if (startDate || endDate) {
      filters.startedAt = {}
      if (startDate) filters.startedAt.$gte = new Date(startDate + 'T00:00:00Z')
      if (endDate) {
        // Set endDate to end of the day (23:59:59.999 UTC)
        filters.startedAt.$lte = new Date(endDate + 'T23:59:59.999Z')
      }
    }

    // Get total count for pagination
    const totalRuns = await db.collection('api_runs').countDocuments(filters)
    
    // Fetch runs with pagination
    const runs = await db.collection('api_runs')
      .find(filters)
      .sort({ startedAt: -1 }) // Newest first
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    // Calculate summary statistics
    const summary = {
      totalRuns,
      successfulRuns: await db.collection('api_runs').countDocuments({ ...filters, status: 'success' }),
      failedRuns: await db.collection('api_runs').countDocuments({ ...filters, status: 'failed' }),
      runningRuns: await db.collection('api_runs').countDocuments({ ...filters, status: 'running' })
    }

    const response = {
      runs,
      pagination: {
        page,
        limit,
        total: totalRuns,
        pages: Math.ceil(totalRuns / limit)
      },
      filters: { status, connectionId, startDate, endDate },
      summary
    }

    console.log("[v0] Retrieved runs:", runs.length)
    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Error fetching runs:", error)
    return NextResponse.json({ error: "Failed to fetch runs" }, { status: 500 })
  }
}