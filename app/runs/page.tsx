import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlayCircle, Clock, CheckCircle2, XCircle, AlertCircle, Search, Filter, Eye } from "lucide-react"

export default function RunsPage() {
  // Mock data
  const runs = [
    {
      id: "1",
      connectionName: "JSONPlaceholder Users API",
      status: "success",
      startedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(Date.now() - 3000000),
      duration: "10m 0s",
      totalRequests: 10,
      successfulRequests: 10,
      failedRequests: 0,
      recordsExtracted: 100,
      recordsLoaded: 100,
    },
    {
      id: "2",
      connectionName: "JSONPlaceholder Users API",
      status: "failed",
      startedAt: new Date(Date.now() - 7200000),
      completedAt: new Date(Date.now() - 6600000),
      duration: "10m 0s",
      totalRequests: 10,
      successfulRequests: 7,
      failedRequests: 3,
      recordsExtracted: 70,
      recordsLoaded: 70,
      errorMessage: "Connection timeout on request 8",
    },
    {
      id: "3",
      connectionName: "JSONPlaceholder Users API",
      status: "running",
      startedAt: new Date(Date.now() - 300000),
      totalRequests: 10,
      successfulRequests: 5,
      failedRequests: 0,
      recordsExtracted: 50,
    },
  ]

  const getStatusIcon = (status: string) => {
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

  const getStatusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Run History</h1>
          <p className="text-muted-foreground mt-1">View and monitor API execution history</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by connection name..." className="pl-9" />
              </div>
              <Select defaultValue="all">
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
                </SelectContent>
              </Select>
              <Select defaultValue="7days">
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

        {/* Runs List */}
        {runs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
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
        ) : (
          <div className="space-y-4">
            {runs.map((run) => (
              <Card key={run.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{run.connectionName}</CardTitle>
                        <Badge variant={getStatusVariant(run.status)} className="gap-1">
                          {getStatusIcon(run.status)}
                          {run.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        Started {run.startedAt.toLocaleString()}
                        {run.completedAt && ` • Completed ${run.completedAt.toLocaleString()}`}
                      </CardDescription>
                    </div>
                    <Link href={`/runs/${run.id}`}>
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-5">
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="text-sm font-medium mt-1">{run.duration || "In progress..."}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Requests</p>
                      <p className="text-sm font-medium mt-1">
                        {run.successfulRequests}/{run.totalRequests}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                      <p className="text-sm font-medium mt-1">
                        {Math.round((run.successfulRequests / run.totalRequests) * 100)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Records Extracted</p>
                      <p className="text-sm font-medium mt-1">{run.recordsExtracted}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Records Loaded</p>
                      <p className="text-sm font-medium mt-1">{run.recordsLoaded || "-"}</p>
                    </div>
                  </div>
                  {run.errorMessage && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive">{run.errorMessage}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
