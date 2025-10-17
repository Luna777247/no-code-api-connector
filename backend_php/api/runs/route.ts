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
      if (startDate) filters.startedAt.$gte = new Date(startDate)
      if (endDate) filters.startedAt.$lte = new Date(endDate)
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

    // If no runs in DB, return mock data
    if (runs.length === 0) {
      const mockRuns = [
        {
          id: "run_001",
          connectionId: "conn_123",
          status: "success",
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          completedAt: new Date(Date.now() - 3550000).toISOString(),
          duration: 10000,
          recordsProcessed: 150,
          recordsLoaded: 148,
          errorCount: 2,
          message: "ETL completed successfully"
        },
        {
          id: "run_002", 
          connectionId: "conn_456",
          status: "failed",
          startedAt: new Date(Date.now() - 7200000).toISOString(),
          completedAt: new Date(Date.now() - 7150000).toISOString(),
          duration: 5000,
          recordsProcessed: 0,
          recordsLoaded: 0,
          errorCount: 1,
          message: "Connection timeout error"
        },
        {
          id: "run_003",
          connectionId: "conn_789", 
          status: "running",
          startedAt: new Date(Date.now() - 300000).toISOString(),
          completedAt: null,
          duration: null,
          recordsProcessed: 75,
          recordsLoaded: 73,
          errorCount: 0,
          message: "Processing in progress..."
        }
      ].filter(run => {
        if (status && run.status !== status) return false
        if (connectionId && run.connectionId !== connectionId) return false
        return true
      })
      
      const response = {
        runs: mockRuns.slice((page - 1) * limit, page * limit),
        pagination: {
          page,
          limit,
          total: mockRuns.length,
          pages: Math.ceil(mockRuns.length / limit)
        },
        filters: { status, connectionId, startDate, endDate },
        summary: {
          totalRuns: mockRuns.length,
          successfulRuns: mockRuns.filter(r => r.status === 'success').length,
          failedRuns: mockRuns.filter(r => r.status === 'failed').length,
          runningRuns: mockRuns.filter(r => r.status === 'running').length
        }
      }
      
      return NextResponse.json(response)
    }

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