import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongo"
import { CollectionManager } from "@/lib/database-schema"

// GET /api/runs - Lấy danh sách tất cả runs với phân trang và filter
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")
    const connectionId = searchParams.get("connectionId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const db = await getDb()

    const filters: any = { type: "run" }

    if (status) {
      filters["runMetadata.status"] = status
    }

    if (connectionId) {
      filters.connectionId = connectionId
    }

    if (startDate || endDate) {
      filters["runMetadata.startedAt"] = {}
      if (startDate) filters["runMetadata.startedAt"].$gte = new Date(startDate + "T00:00:00Z")
      if (endDate) {
        filters["runMetadata.startedAt"].$lte = new Date(endDate + "T23:59:59.999Z")
      }
    }

    const totalRuns = await db.collection(CollectionManager.getCollectionName("DATA")).countDocuments(filters)

    const runs = await db
      .collection(CollectionManager.getCollectionName("DATA"))
      .find(filters)
      .sort({ "runMetadata.startedAt": -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    const transformedRuns = runs.map((run) => ({
      id: run._id.toString(),
      status: run.runMetadata?.status || "running",
      startedAt: run.runMetadata?.startedAt || run._insertedAt,
      duration: run.runMetadata?.duration,
      recordsExtracted: run.runMetadata?.recordsExtracted,
      errorMessage: run.runMetadata?.errorMessage,
      connectionId: run.connectionId,
      runId: run.runId,
    }))

    const summary = {
      totalRuns,
      successfulRuns: await db
        .collection(CollectionManager.getCollectionName("DATA"))
        .countDocuments({ ...filters, "runMetadata.status": "success" }),
      failedRuns: await db
        .collection(CollectionManager.getCollectionName("DATA"))
        .countDocuments({ ...filters, "runMetadata.status": "failed" }),
      runningRuns: await db
        .collection(CollectionManager.getCollectionName("DATA"))
        .countDocuments({ ...filters, "runMetadata.status": "running" }),
    }

    const response = {
      runs: transformedRuns,
      pagination: {
        page,
        limit,
        total: totalRuns,
        pages: Math.ceil(totalRuns / limit),
      },
      filters: { status, connectionId, startDate, endDate },
      summary,
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch runs" }, { status: 500 })
  }
}
