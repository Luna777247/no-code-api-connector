import { NextResponse } from "next/server"
import { WorkflowOrchestrator } from "@/lib/workflow-orchestrator"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("[v0] Received run execution request:", body)

    const orchestrator = new WorkflowOrchestrator()
    const result = await orchestrator.executeWorkflow(body)

    console.log("[v0] Workflow execution completed:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Error executing workflow:", error)
    return NextResponse.json(
      {
        error: "Failed to execute workflow",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
