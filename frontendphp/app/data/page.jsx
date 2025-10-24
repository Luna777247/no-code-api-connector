"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Database, Search, Filter, Clock, XCircle, ChevronDown } from "lucide-react"
import { PageLayout } from "@/components/ui/page-layout"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import apiClient from "../../services/apiClient.js"
import { AdvancedFilterPanel } from "@/components/data-explorer/advanced-filter-panel.jsx"
import { DataExportDialog } from "@/components/data-explorer/data-export-dialog.jsx"

export default function DataPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedConnection, setSelectedConnection] = useState("all")
  const [filters, setFilters] = useState({})
  const [filteredData, setFilteredData] = useState(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  useEffect(() => {
    console.log('Fetching data...')
    // Temporarily use mock data to test rendering
    const mockData = {
      summary: {
        totalRuns: 6,
        totalRecords: 0,
        avgExecutionTime: 0,
        estimatedDataSize: "0 bytes"
      },
      connectionBreakdown: [
        {
          connectionId: "conn_1761241715858_q619f16it",
          connectionName: "default-application_11168091",
          runCount: 3,
          totalRecords: 0,
          avgExecutionTime: 0,
          lastRun: "2025-10-23T19:49:37+02:00"
        },
        {
          connectionId: "conn_1761241241112_9yeknan12",
          connectionName: "distanceto",
          runCount: 3,
          totalRecords: 0,
          avgExecutionTime: 0,
          lastRun: "2025-10-23T19:41:27+02:00"
        }
      ],
      data: []
    }
    console.log('Using mock data:', mockData)
    setData(mockData)
    setFilteredData(mockData)
    setLoading(false)

    /*
    apiClient
      .get("/api/data")
      .then((res) => {
        console.log('Data API response:', res)
        console.log('Data response.data:', res?.data)
        const data = res?.data || null
        console.log('Setting data:', data)
        setData(data)
        setFilteredData(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching data:', err)
        console.error('Error details:', err.response?.data, err.message)
        setError("Failed to load data")
        setLoading(false)
      })
    */
  }, [])

  useEffect(() => {
    if (!data) return

    const result = { ...data }

    // Filter by connection
    if (selectedConnection !== "all") {
      result.connectionBreakdown = result.connectionBreakdown.filter((c) => c.connectionId === selectedConnection)
    }

    // Filter by search term
    if (searchTerm) {
      result.connectionBreakdown = result.connectionBreakdown.filter(
        (c) =>
          (c.connectionName || c.connectionId).toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.connectionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Apply advanced filters
    if (Object.keys(filters).length > 0) {
      result.connectionBreakdown = result.connectionBreakdown.filter((connection) => {
        if (filters.minRecords && connection.totalRecords < filters.minRecords) return false
        if (filters.maxRecords && connection.totalRecords > filters.maxRecords) return false
        if (filters.minExecutionTime && connection.avgExecutionTime < filters.minExecutionTime) return false
        if (filters.maxExecutionTime && connection.avgExecutionTime > filters.maxExecutionTime) return false
        if (filters.status && connection.status !== filters.status) return false
        return true
      })
    }

    setFilteredData(result)
  }, [data, searchTerm, selectedConnection, filters])

  const connections = data?.connectionBreakdown?.map((c) => c.connectionId) || []
  const uniqueConnections = [...new Set(connections)]

  return (
    <PageLayout title="Data Explorer" description="Browse and export extracted data" showBackButton={true}>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by connection name or ID..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Connections</SelectItem>
                  {uniqueConnections.map((conn) => (
                    <SelectItem key={conn} value={conn}>
                      {conn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-transparent">
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Advanced Filters
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <AdvancedFilterPanel filters={filters} onFiltersChange={setFilters} />
              </CollapsibleContent>
            </Collapsible>
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
      ) : !filteredData || (filteredData.connectionBreakdown || []).length === 0 ? (
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
                <CardTitle className="text-2xl">{filteredData.summary.totalRuns}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Records</CardDescription>
                <CardTitle className="text-2xl">{filteredData.summary.totalRecords}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Avg Execution Time</CardDescription>
                <CardTitle className="text-2xl">{Math.round(filteredData.summary.avgExecutionTime / 1000)}s</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Data Size</CardDescription>
                <CardTitle className="text-2xl">{filteredData.summary.estimatedDataSize}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4">
            {filteredData.connectionBreakdown.map((connection) => {
              const lastRun = new Date(connection.lastRun)
              return (
                <Card key={connection.connectionId}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Database className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-lg font-mono">{connection.connectionName || connection.connectionId}</CardTitle>
                          <Badge variant="outline">{connection.totalRecords} records</Badge>
                          <Badge variant="secondary">{connection.runCount} runs</Badge>
                        </div>
                        <CardDescription>
                          Last updated: {lastRun.toLocaleString()} • Avg:{" "}
                          {Math.round(connection.avgExecutionTime / 1000)}s
                        </CardDescription>
                      </div>
                      <DataExportDialog connection={connection} />
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
