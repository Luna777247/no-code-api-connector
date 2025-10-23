// Airflow API client for managing DAGs and schedules
export interface AirflowDAG {
  dag_id: string
  is_paused: boolean
  schedule_interval: string | null
  description: string
  tags: string[]
  last_parsed_time: string
  fileloc: string
}

export interface AirflowDagRun {
  dag_id: string
  dag_run_id: string
  execution_date: string
  start_date: string
  end_date: string | null
  state: 'success' | 'running' | 'failed'
  external_trigger: boolean
}

export class AirflowClient {
  private baseUrl: string
  private auth?: { username: string; password: string }

  constructor(baseUrl = 'http://localhost:8080/api/v1', auth?: { username: string; password: string }) {
    this.baseUrl = baseUrl
    this.auth = auth
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    }

    if (this.auth) {
      const credentials = btoa(`${this.auth.username}:${this.auth.password}`)
      headers['Authorization'] = `Basic ${credentials}`
    }

    console.log(`[v0] Airflow API request: ${options.method || 'GET'} ${url}`)

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Airflow API error (${response.status}): ${errorText}`)
    }

    return response.json()
  }

  // Get all DAGs
  async getDags(): Promise<AirflowDAG[]> {
    const response = await this.request('/dags')
    return response.dags || []
  }

  // Get specific DAG
  async getDag(dagId: string): Promise<AirflowDAG | null> {
    try {
      return await this.request(`/dags/${dagId}`)
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  // Create/Update DAG (by creating DAG file)
  async createDag(connectionId: string, scheduleInterval: string, workflowConfig: any): Promise<string> {
    const dagId = `etl_workflow_${connectionId}`
    
    // Generate DAG file content
    const dagContent = this.generateDagFile(connectionId, scheduleInterval, workflowConfig)
    
    // In a real implementation, you would write this to the DAGs folder
    // For now, we'll simulate it by returning the DAG ID
    console.log(`[v0] Creating DAG file: ${dagId}`)
    console.log(`[v0] Schedule interval: ${scheduleInterval}`)
    
    return dagId
  }

  // Pause/Unpause DAG
  async pauseDag(dagId: string, isPaused: boolean): Promise<void> {
    await this.request(`/dags/${dagId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_paused: isPaused })
    })
    console.log(`[v0] DAG ${dagId} ${isPaused ? 'paused' : 'unpaused'}`)
  }

  // Trigger DAG run
  async triggerDag(dagId: string, conf?: any): Promise<AirflowDagRun> {
    const dagRun = await this.request(`/dags/${dagId}/dagRuns`, {
      method: 'POST',
      body: JSON.stringify({
        dag_run_id: `manual_${Date.now()}`,
        conf: conf || {},
        execution_date: new Date().toISOString()
      })
    })
    
    console.log(`[v0] Triggered DAG run: ${dagRun.dag_run_id}`)
    return dagRun
  }

  // Get DAG runs
  async getDagRuns(dagId: string, limit = 10): Promise<AirflowDagRun[]> {
    const response = await this.request(`/dags/${dagId}/dagRuns?limit=${limit}`)
    return response.dag_runs || []
  }

  // Delete DAG (by removing file - this is a simplified approach)
  async deleteDag(dagId: string): Promise<void> {
    // In a real implementation, you would delete the DAG file
    // Airflow will automatically remove it from the web UI
    console.log(`[v0] DAG ${dagId} marked for deletion`)
  }

  // Generate DAG file content
  private generateDagFile(connectionId: string, scheduleInterval: string, workflowConfig: any): string {
    const dagId = `etl_workflow_${connectionId}`
    
    return `
# Auto-generated DAG for connection: ${connectionId}
from dags.etl_workflow_template import create_etl_dag

# Create the DAG
${dagId} = create_etl_dag(
    connection_id='${connectionId}',
    schedule_interval='${scheduleInterval}',
    workflow_config=${JSON.stringify(workflowConfig, null, 4)}
)

# Make DAG available to Airflow
globals()['${dagId}'] = ${dagId}
`
  }

  // Health check
  async healthCheck(): Promise<{ status: string; version?: string }> {
    try {
      const response = await this.request('/health')
      return { status: 'healthy', version: response.version }
    } catch (error) {
      return { status: 'unhealthy' }
    }
  }
}

// Export singleton instance
const airflowClient = new AirflowClient(
  process.env.AIRFLOW_API_URL || 'http://localhost:8080/api/v1',
  process.env.AIRFLOW_USERNAME && process.env.AIRFLOW_PASSWORD
    ? { username: process.env.AIRFLOW_USERNAME, password: process.env.AIRFLOW_PASSWORD }
    : undefined
)

export { airflowClient }