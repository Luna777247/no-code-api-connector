import { NextResponse } from "next/server"
import { BinaryWorkflowOrchestrator } from "@/lib/binary-workflow-orchestrator"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("[v0] Received binary workflow execution request:", body)

    const orchestrator = new BinaryWorkflowOrchestrator()
    const result = await orchestrator.executeBinaryWorkflow({
      ...body,
      isBinaryResponse: true // Mark as binary response handler
    })

    console.log("[v0] Binary workflow execution completed:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Error executing binary workflow:", error)
    return NextResponse.json(
      {
        error: "Failed to execute binary workflow",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}