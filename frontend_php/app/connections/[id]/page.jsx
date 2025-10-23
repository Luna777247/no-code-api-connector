'use client'

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
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
import apiClient from "../../../services/apiClient.js"

export default function ConnectionDetailPage() {
  const params = useParams()
  const connectionId = Array.isArray(params?.id) ? params.id[0] : params?.id

  const [connection, setConnection] = useState(null)
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [testingConnection, setTestingConnection] = useState(false)

  useEffect(() => {
    async function fetchConnectionDetails() {
      try {
        if (!connectionId) return
        setLoading(true)
        const connectionRes = await apiClient.get(`/api/connections/${connectionId}`)
        setConnection(connectionRes.data)
        const runsRes = await apiClient.get(`/api/runs`, { params: { connectionId, limit: 10 } })
        setRuns(runsRes.data?.runs || [])
      } catch (err) {
        console.error('[v0] Error fetching connection:', err)
        setError(err instanceof Error ? err.message : 'Failed to load connection')
      } finally {
        setLoading(false)
      }
    }
    fetchConnectionDetails()
  }, [connectionId])

  const handleTestConnection = async () => {
    if (!connection) return
    setTestingConnection(true)
    setTestResult(null)
    try {
      const testData = {
        apiConfig: {
          baseUrl: connection.baseUrl,
          method: connection.method,
          headers: connection.headers || {}
        }
      }
      const response = await apiClient.post('/api/test-connection', testData)
      const result = response.data
      setTestResult({
        success: result.success,
        message: result.success ? result.message : result.error,
        status: result.status,
        statusText: result.statusText,
        timestamp: new Date()
      })
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed: Unknown error',
        timestamp: new Date()
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleRunNow = async () => {
    if (!connection) return
    try {
      const runData = {
        connectionId: connection.connectionId || connection.id,
        apiConfig: {
          baseUrl: connection.baseUrl,
          method: connection.method,
          headers: connection.headers || {}
        },
        parameters: [],
        fieldMappings: []
      }
      const response = await apiClient.post('/api/execute-run', runData)
      const result = response.data
      if (result.runId) {
        alert(`Pipeline started! Run ID: ${result.runId}`)
        window.location.reload()
      } else {
        alert('Failed to start pipeline')
      }
    } catch (err) {
      alert('Run failed: ' + err)
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
              disabled={testingConnection}
            >
              {testingConnection ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Activity className="h-4 w-4 mr-2" />
              )}
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button 
              size="sm"
              onClick={handleRunNow}
              disabled={!connection.isActive}
            >
              <Play className="h-4 w-4 mr-2" />
              Run Now
            </Button>
            <Link href={`/connections/${connection.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <Card className={`border ${testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      Connection Test {testResult.success ? 'Successful' : 'Failed'}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {testResult.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {testResult.message}
                  </p>
                  {testResult.status && (
                    <p className="text-xs text-muted-foreground mt-2">
                      HTTP {testResult.status} {testResult.statusText}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                              : String(value)}
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
                            <p className="text-sm font-medium">Run {String(run.id).substring(0, 8)}</p>
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
                              {String(run.errorMessage).substring(0, 50)}...
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
                <Link href={`/mappings?connectionId=${connection.id}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Field Mappings
                  </Button>
                </Link>
                <Link href={`/schedules?connectionId=${connection.id}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="h-4 w-4 mr-2" />
                    Schedules
                  </Button>
                </Link>
                <Link href={`/runs?connectionId=${connection.id}`}>
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
