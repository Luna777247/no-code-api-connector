import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Database, FileJson } from "lucide-react"

export default function RunDetailPage({ params }: { params: { id: string } }) {
  // Mock data
  const run = {
    id: params.id,
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
  }

  const logs = [
    { id: 1, level: "info", message: "Starting API run", timestamp: new Date(Date.now() - 3600000) },
    { id: 2, level: "info", message: "Executing request 1/10", timestamp: new Date(Date.now() - 3540000) },
    { id: 3, level: "info", message: "Successfully fetched 10 records", timestamp: new Date(Date.now() - 3480000) },
    { id: 4, level: "info", message: "Executing request 2/10", timestamp: new Date(Date.now() - 3420000) },
    { id: 5, level: "info", message: "Successfully fetched 10 records", timestamp: new Date(Date.now() - 3360000) },
    { id: 6, level: "info", message: "Data transformation completed", timestamp: new Date(Date.now() - 3120000) },
    { id: 7, level: "info", message: "Loading data to database", timestamp: new Date(Date.now() - 3060000) },
    { id: 8, level: "info", message: "Successfully loaded 100 records", timestamp: new Date(Date.now() - 3000000) },
    { id: 9, level: "info", message: "Run completed successfully", timestamp: new Date(Date.now() - 3000000) },
  ]

  const requests = [
    {
      id: 1,
      url: "https://jsonplaceholder.typicode.com/users?id=1",
      status: 200,
      responseTime: 245,
      recordsExtracted: 10,
      timestamp: new Date(Date.now() - 3540000),
    },
    {
      id: 2,
      url: "https://jsonplaceholder.typicode.com/users?id=2",
      status: 200,
      responseTime: 198,
      recordsExtracted: 10,
      timestamp: new Date(Date.now() - 3420000),
    },
    {
      id: 3,
      url: "https://jsonplaceholder.typicode.com/users?id=3",
      status: 200,
      responseTime: 212,
      recordsExtracted: 10,
      timestamp: new Date(Date.now() - 3300000),
    },
  ]

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4 gap-2">
            <Link href="/runs">
              <ArrowLeft className="h-4 w-4" />
              Back to Runs
            </Link>
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{run.connectionName}</h1>
              <p className="text-muted-foreground mt-1">Run ID: {run.id}</p>
            </div>
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-4 w-4" />
              {run.status}
            </Badge>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{run.duration}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {run.successfulRequests}/{run.totalRequests}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Records Extracted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{run.recordsExtracted}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Records Loaded</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{run.recordsLoaded}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="logs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="data">Extracted Data</TabsTrigger>
          </TabsList>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Execution Logs</CardTitle>
                <CardDescription>Detailed logs from this run</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50">
                        {getLevelIcon(log.level)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{log.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{log.timestamp.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>API Requests</CardTitle>
                <CardDescription>Individual requests made during this run</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {requests.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <code className="text-xs bg-muted px-2 py-1 rounded break-all">{request.url}</code>
                        </div>
                        <Badge variant="outline">{request.status}</Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">Response Time:</span>
                          <span className="font-medium ml-2">{request.responseTime}ms</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Records:</span>
                          <span className="font-medium ml-2">{request.recordsExtracted}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Time:</span>
                          <span className="font-medium ml-2">{request.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle>Extracted Data</CardTitle>
                <CardDescription>Preview of data extracted from API responses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">100 records extracted</span>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <FileJson className="h-4 w-4" />
                      Export JSON
                    </Button>
                  </div>
                  <ScrollArea className="h-80 border rounded-lg">
                    <pre className="p-4 text-xs font-mono">
                      {JSON.stringify(
                        [
                          {
                            user_id: 1,
                            user_name: "John Doe",
                            user_email: "john@example.com",
                            user_phone: "+1-234-567-8900",
                            company_name: "Acme Corp",
                          },
                          {
                            user_id: 2,
                            user_name: "Jane Smith",
                            user_email: "jane@example.com",
                            user_phone: "+1-234-567-8901",
                            company_name: "Tech Inc",
                          },
                        ],
                        null,
                        2,
                      )}
                    </pre>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
