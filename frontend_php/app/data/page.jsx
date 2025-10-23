'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Database, Search, Download, Filter, Clock, XCircle } from "lucide-react"
import { PageLayout } from "@/components/ui/page-layout"
import apiClient from "../../services/apiClient.js"

export default function DataPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiClient.get('/api/data')
      .then((res) => {
        setData(res?.data || null)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load data')
        setLoading(false)
      })
  }, [])

  return (
    <PageLayout
      title="Data Explorer"
      description="Browse and export extracted data"
      showBackButton={true}
    >

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tables..." className="pl-9" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Connections</SelectItem>
                  <SelectItem value="users">Users API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading data...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error loading data</h3>
              <p className="text-muted-foreground text-center">{error}</p>
            </CardContent>
          </Card>
        ) : !data || (data.connectionBreakdown || []).length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No data yet</h3>
              <p className="text-muted-foreground text-center mb-4 text-pretty max-w-md">
                Data will appear here once you run an API connection
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Runs</CardDescription>
                  <CardTitle className="text-2xl">{data.summary.totalRuns}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Records</CardDescription>
                  <CardTitle className="text-2xl">{data.summary.totalRecords}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Avg Execution Time</CardDescription>
                  <CardTitle className="text-2xl">{Math.round(data.summary.avgExecutionTime / 1000)}s</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Data Size</CardDescription>
                  <CardTitle className="text-2xl">{data.summary.estimatedDataSize}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid gap-4">
              {data.connectionBreakdown.map((connection) => {
                const lastRun = new Date(connection.lastRun)
                return (
                  <Card key={connection.connectionId}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Database className="h-5 w-5 text-muted-foreground" />
                            <CardTitle className="text-lg font-mono">{connection.connectionId}</CardTitle>
                            <Badge variant="outline">{connection.totalRecords} records</Badge>
                            <Badge variant="secondary">{connection.runCount} runs</Badge>
                          </div>
                          <CardDescription>
                            Last updated: {lastRun.toLocaleString()} • Avg: {Math.round(connection.avgExecutionTime / 1000)}s
                          </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                          <Download className="h-4 w-4" />
                          Export
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </>
        )}
    </PageLayout>
  )
}
