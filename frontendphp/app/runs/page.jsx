'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlayCircle, Clock, CheckCircle2, XCircle, AlertCircle, Search, Filter, Eye, Trash2 } from "lucide-react"
import { PageLayout } from "@/components/ui/page-layout"
import apiClient from "../../services/apiClient.js"

export default function RunsPage() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [timeFilter, setTimeFilter] = useState("24hours")
  const [deletingId, setDeletingId] = useState(null)
  const handleDeleteRun = async (runId) => {
    if (!confirm('Are you sure you want to delete this run? This action cannot be undone.')) {
      return
    }
    
    setDeletingId(runId)
    try {
      try {
        // Try with plural endpoint first
        await apiClient.delete(`/api/runs/${runId}`)
      } catch (err) {
        if (err.response?.status === 404) {
          console.log('Run not found on server, removing from UI...')
          // Still remove from UI even if not found on server
        } else {
          throw err
        }
      }
      
      // Update the UI by removing the deleted run
      setRuns(prevRuns => prevRuns.filter(run => run.id !== runId))
    } catch (err) {
      console.error('Error deleting run:', err)
      setError('Failed to delete run. ' + (err.response?.data?.message || 'Please try again.'))
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    apiClient.get('/api/runs')
      .then(res => {
        console.log('[DEBUG] Full API Response:', res)
        const data = res?.data || {}
        const runsData = Array.isArray(data) ? data : (data.runs || [])
        console.log('[DEBUG] Extracted runs:', runsData)
        setRuns(runsData)
        setLoading(false)
      })
      .catch(err => {
        console.error('[DEBUG] Error loading runs:', err)
        setError('Failed to load runs')
        setLoading(false)
      })
  }, [])

  // Filter runs based on search, status, and time
  const filteredRuns = runs.filter(run => {
    // Search filter
    if (searchTerm && !run.connectionName?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    // Status filter
    if (statusFilter !== "all" && run.status !== statusFilter) {
      return false
    }

    // Time filter
    if (timeFilter !== "all" && run.startedAt) {
      const runDate = new Date(run.startedAt)
      const now = new Date()
      const diffMs = now - runDate
      const diffHours = diffMs / (1000 * 60 * 60)
      const diffDays = diffHours / 24

      if (timeFilter === "24hours" && diffHours > 24) return false
      if (timeFilter === "7days" && diffDays > 7) return false
      if (timeFilter === "30days" && diffDays > 30) return false
    }

    return true
  })

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4" />
      case "failed":
        return <XCircle className="h-4 w-4" />
      case "running":
        return <Clock className="h-4 w-4 animate-spin" />
      case "partial":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <PlayCircle className="h-4 w-4" />
    }
  }

  const getStatusVariant = (status) => {
    switch (status) {
      case "success":
        return "default"
      case "failed":
        return "destructive"
      case "running":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <PageLayout
      title="Run History"
      description="View and monitor API execution history"
      showBackButton={true}
    >

        <Card className="mb-6">
          <CardContent className="pt-6" suppressHydrationWarning={true}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by connection name..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24hours">Last 24 Hours</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12" suppressHydrationWarning={true}>
              <Clock className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading runs...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="flex flex-col items-center justify-center py-12" suppressHydrationWarning={true}>
              <XCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error loading runs</h3>
              <p className="text-muted-foreground text-center">{error}</p>
            </CardContent>
          </Card>
        ) : runs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12" suppressHydrationWarning={true}>
              <PlayCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No runs yet</h3>
              <p className="text-muted-foreground text-center mb-4 text-pretty max-w-md">
                API runs will appear here once you execute a connection
              </p>
              <Link href="/connections">
                <Button>View Connections</Button>
              </Link>
            </CardContent>
          </Card>
        ) : filteredRuns.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12" suppressHydrationWarning={true}>
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No runs found</h3>
              <p className="text-muted-foreground text-center">
                Try adjusting your filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4" suppressHydrationWarning={true}>
            {filteredRuns.map((run) => {
              const duration = run.executionTime 
                ? `${Math.floor(run.executionTime / 1000)}s` 
                : "In progress..."
              const startDate = new Date(run.startedAt)
              const completedDate = run.completedAt ? new Date(run.completedAt) : null
              return (
                <Card key={run.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">Connection: {run.connectionName || run.connectionId}</CardTitle>
                          <Badge variant={getStatusVariant(run.status)} className="gap-1">
                            {getStatusIcon(run.status)}
                            {run.status}
                          </Badge>
                        </div>
                        <CardDescription>
                          Started {startDate.toLocaleString()}
                          {completedDate && ` • Completed ${completedDate.toLocaleString()}`}
                        </CardDescription>
                        {run.metadata?.apiUrl && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono">
                            {run.metadata.method || 'GET'} {run.metadata.apiUrl}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/runs/${run.id}`}>
                          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 bg-transparent text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDeleteRun(run.id)
                          }}
                          disabled={deletingId === run.id}
                        >
                          {deletingId === run.id ? (
                            <Clock className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          {deletingId === run.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent suppressHydrationWarning={true}>
                    <div className="grid gap-4 md:grid-cols-5">
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-sm font-medium mt-1">{duration}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Requests</p>
                        <p className="text-sm font-medium mt-1">{run.successfulRequests}/{run.totalRequests}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Success Rate</p>
                        <p className="text-sm font-medium mt-1">{run.totalRequests > 0 ? Math.round((run.successfulRequests / run.totalRequests) * 100) : 0}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Records Processed</p>
                        <p className="text-sm font-medium mt-1">{run.recordsProcessed}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Failed Requests</p>
                        <p className="text-sm font-medium mt-1">{run.failedRequests}</p>
                      </div>
                    </div>
                    {run.errors && (
                      <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm text-destructive">{JSON.stringify(run.errors)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
    </PageLayout>
  )
}
