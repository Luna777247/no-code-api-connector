"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Zap,
  Search,
} from "lucide-react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { BackToHomeButton } from "@/components/ui/back-to-home-button"

export default function MonitoringPage() {
  const [timeRange, setTimeRange] = useState("24h")

  // Mock data for charts
  const successRateData = [
    { time: "00:00", rate: 98 },
    { time: "04:00", rate: 100 },
    { time: "08:00", rate: 95 },
    { time: "12:00", rate: 97 },
    { time: "16:00", rate: 99 },
    { time: "20:00", rate: 100 },
  ]

  const requestVolumeData = [
    { time: "00:00", requests: 45 },
    { time: "04:00", requests: 32 },
    { time: "08:00", requests: 78 },
    { time: "12:00", requests: 95 },
    { time: "16:00", requests: 67 },
    { time: "20:00", requests: 54 },
  ]

  const responseTimeData = [
    { time: "00:00", avg: 245, p95: 380 },
    { time: "04:00", avg: 198, p95: 320 },
    { time: "08:00", avg: 312, p95: 450 },
    { time: "12:00", avg: 267, p95: 410 },
    { time: "16:00", avg: 223, p95: 365 },
    { time: "20:00", avg: 189, p95: 298 },
  ]

  const recentLogs = [
    {
      id: 1,
      level: "info",
      connection: "JSONPlaceholder Users API",
      message: "Run completed successfully",
      timestamp: new Date(Date.now() - 300000),
    },
    {
      id: 2,
      level: "warning",
      connection: "JSONPlaceholder Users API",
      message: "Response time exceeded 500ms threshold",
      timestamp: new Date(Date.now() - 600000),
    },
    {
      id: 3,
      level: "error",
      connection: "Weather API",
      message: "Connection timeout after 30s",
      timestamp: new Date(Date.now() - 900000),
    },
    {
      id: 4,
      level: "info",
      connection: "JSONPlaceholder Users API",
      message: "Successfully extracted 100 records",
      timestamp: new Date(Date.now() - 1200000),
    },
    {
      id: 5,
      level: "info",
      connection: "JSONPlaceholder Users API",
      message: "Data transformation completed",
      timestamp: new Date(Date.now() - 1500000),
    },
  ]

  const alerts = [
    {
      id: 1,
      severity: "high",
      connection: "Weather API",
      message: "3 consecutive failures detected",
      timestamp: new Date(Date.now() - 900000),
      status: "active",
    },
    {
      id: 2,
      severity: "medium",
      connection: "JSONPlaceholder Users API",
      message: "Average response time increased by 40%",
      timestamp: new Date(Date.now() - 1800000),
      status: "active",
    },
    {
      id: 3,
      severity: "low",
      connection: "User Data API",
      message: "Schedule delayed by 5 minutes",
      timestamp: new Date(Date.now() - 3600000),
      status: "resolved",
    },
  ]

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      default:
        return "secondary"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <BackToHomeButton />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Monitoring & Logs</h1>
              <p className="text-muted-foreground mt-1">Real-time system health and performance metrics</p>
            </div>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">98.5%</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +2.1% from last period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">245ms</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingDown className="h-3 w-3 mr-1" />
                -15ms from last period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,247</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12% from last period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <div className="flex items-center text-xs text-yellow-600 mt-1">
                <AlertCircle className="h-3 w-3 mr-1" />1 high, 1 medium
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Success Rate Over Time</CardTitle>
              <CardDescription>Percentage of successful API calls</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={successRateData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis domain={[90, 100]} className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request Volume</CardTitle>
              <CardDescription>Number of API requests per time period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={requestVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="requests" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Response Time Distribution</CardTitle>
              <CardDescription>Average and 95th percentile response times</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="avg" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Average" />
                  <Line
                    type="monotone"
                    dataKey="p95"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="95th Percentile"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Logs and Alerts */}
        <Tabs defaultValue="logs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="logs">Recent Logs</TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                2
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="connections">Connection Health</TabsTrigger>
          </TabsList>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>System Logs</CardTitle>
                    <CardDescription>Real-time logs from all API connections</CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search logs..." className="pl-9" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {recentLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50">
                        {getLevelIcon(log.level)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {log.connection}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{log.timestamp.toLocaleString()}</span>
                          </div>
                          <p className="text-sm">{log.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Active Alerts</CardTitle>
                <CardDescription>System alerts and notifications requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 border rounded-lg ${alert.status === "resolved" ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(alert.severity) as any}>{alert.severity}</Badge>
                          <Badge variant="outline">{alert.connection}</Badge>
                        </div>
                        <Badge variant={alert.status === "active" ? "destructive" : "secondary"}>{alert.status}</Badge>
                      </div>
                      <p className="text-sm mb-2">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">{alert.timestamp.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="connections">
            <Card>
              <CardHeader>
                <CardTitle>Connection Health Status</CardTitle>
                <CardDescription>Health metrics for each API connection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">JSONPlaceholder Users API</p>
                          <p className="text-xs text-muted-foreground">Last run: 5 minutes ago</p>
                        </div>
                      </div>
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Healthy
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Success Rate</p>
                        <p className="font-medium">100%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Avg Response</p>
                        <p className="font-medium">245ms</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Uptime</p>
                        <p className="font-medium">99.9%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Total Runs</p>
                        <p className="font-medium">1,247</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg border-destructive/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Weather API</p>
                          <p className="text-xs text-muted-foreground">Last run: 15 minutes ago</p>
                        </div>
                      </div>
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Degraded
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Success Rate</p>
                        <p className="font-medium text-destructive">70%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Avg Response</p>
                        <p className="font-medium">1,245ms</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Uptime</p>
                        <p className="font-medium">85.2%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Total Runs</p>
                        <p className="font-medium">342</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
