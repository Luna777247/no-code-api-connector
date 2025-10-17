'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, 
  Play, 
  Settings, 
  Database, 
  Clock, 
  CheckCircle, 
  XCircle,
  Activity,
  ExternalLink,
  Edit
} from "lucide-react"
import { BackToHomeButton } from "@/components/ui/back-to-home-button"

interface Connection {
  _id: string
  connectionId: string
  name: string
  description: string
  baseUrl: string
  method: string
  headers?: Record<string, string>
  authType: string
  isActive: boolean
  createdAt: string
  lastRun?: string
  totalRuns: number
  successRate: number
}

interface Run {
  id: string
  status: 'completed' | 'failed' | 'running'
  startedAt: string
  duration?: number
  recordsExtracted?: number
  errorMessage?: string
}

export default function ConnectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [connection, setConnection] = useState<Connection | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConnectionDetails() {
      try {
        // Await params to get the id
        const resolvedParams = await params
        const connectionId = resolvedParams.id
        
        console.log('[v0] Fetching connection details for:', connectionId)
        
        // Fetch connection details
        const connectionRes = await fetch(`/api/connections/${connectionId}`)
        if (!connectionRes.ok) {
          throw new Error('Connection not found')
        }
        const connectionData = await connectionRes.json()
        setConnection(connectionData)

        // Fetch recent runs for this connection
        const runsRes = await fetch(`/api/runs?connectionId=${connectionId}&limit=10`)
        if (runsRes.ok) {
          const runsData = await runsRes.json()
          setRuns(runsData.runs || [])
        }

      } catch (err) {
        console.error('[v0] Error fetching connection:', err)
        setError(err instanceof Error ? err.message : 'Failed to load connection')
      } finally {
        setLoading(false)
      }
    }

    fetchConnectionDetails()
  }, [])

  const handleTestConnection = async () => {
    if (!connection) return
    
    try {
      const testData = {
        apiConfig: {
          baseUrl: connection.baseUrl,
          method: connection.method,
          headers: connection.headers || {}
        }
      }

      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      })

      const result = await response.json()
      if (result.success) {
        alert('Connection test successful!')
      } else {
        alert(`Connection test failed: ${result.error}`)
      }
    } catch (error) {
      alert('Test failed: ' + error)
    }
  }

  const handleRunNow = async () => {
    if (!connection) return
    
    try {
      const runData = {
        connectionId: connection.connectionId,
        apiConfig: {
          baseUrl: connection.baseUrl,
          method: connection.method,
          headers: connection.headers || {}
        },
        parameters: [],
        fieldMappings: []
      }

      const response = await fetch('/api/execute-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runData)
      })

      const result = await response.json()
      if (result.runId) {
        alert(`Pipeline started! Run ID: ${result.runId}`)
        // Refresh runs list
        window.location.reload()
      } else {
        alert('Failed to start pipeline')
      }
    } catch (error) {
      alert('Run failed: ' + error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !connection) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/connections">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Connections
              </Button>
            </Link>
          </div>
          
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Connection Not Found</CardTitle>
              <CardDescription>
                The connection you're looking for doesn't exist or has been deleted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Error: {error || 'Unknown error'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <BackToHomeButton />
            <Link href="/connections">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Connections
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{connection.name}</h1>
              <p className="text-muted-foreground">{connection.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleTestConnection}
            >
              <Activity className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
            <Button 
              size="sm"
              onClick={handleRunNow}
              disabled={!connection.isActive}
            >
              <Play className="h-4 w-4 mr-2" />
              Run Now
            </Button>
            <Link href={`/connections/${connection.connectionId}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Connection Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Base URL</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                        {connection.baseUrl}
                      </code>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Method</label>
                    <div className="mt-1">
                      <Badge variant="outline">{connection.method}</Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Authentication</label>
                    <div className="mt-1">
                      <Badge variant="secondary">{connection.authType}</Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div className="mt-1">
                      <Badge variant={connection.isActive ? "default" : "secondary"}>
                        {connection.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {connection.headers && Object.keys(connection.headers).length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Headers</label>
                    <div className="mt-2 space-y-2">
                      {Object.entries(connection.headers).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {key}
                          </code>
                          <span className="text-xs text-muted-foreground">→</span>
                          <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                            {typeof value === 'string' && value.length > 50 
                              ? value.substring(0, 50) + '...' 
                              : value}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Runs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Runs
                </CardTitle>
                <CardDescription>
                  Latest pipeline executions for this connection
                </CardDescription>
              </CardHeader>
              <CardContent>
                {runs.length > 0 ? (
                  <div className="space-y-3">
                    {runs.map((run) => (
                      <div 
                        key={run.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {run.status === 'completed' && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {run.status === 'failed' && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          {run.status === 'running' && (
                            <Activity className="h-4 w-4 text-blue-500 animate-spin" />
                          )}
                          <div>
                            <p className="text-sm font-medium">Run {run.id.substring(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(run.startedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {run.recordsExtracted && (
                            <p className="text-sm font-medium">{run.recordsExtracted} records</p>
                          )}
                          {run.duration && (
                            <p className="text-xs text-muted-foreground">
                              {Math.round(run.duration / 1000)}s
                            </p>
                          )}
                          {run.errorMessage && (
                            <p className="text-xs text-red-500">
                              {run.errorMessage.substring(0, 50)}...
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No runs yet</p>
                    <p className="text-sm">Click "Run Now" to execute this connection</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Runs</span>
                    <span className="font-medium">{connection.totalRuns}</span>
                  </div>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="font-medium">{connection.successRate}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${connection.successRate}%` }}
                    />
                  </div>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Run</span>
                    <span className="text-sm">
                      {connection.lastRun ? new Date(connection.lastRun).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm">
                      {new Date(connection.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/mappings?connectionId=${connection.connectionId}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Field Mappings
                  </Button>
                </Link>
                <Link href={`/schedules?connectionId=${connection.connectionId}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="h-4 w-4 mr-2" />
                    Schedules
                  </Button>
                </Link>
                <Link href={`/runs?connectionId=${connection.connectionId}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="h-4 w-4 mr-2" />
                    All Runs
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}