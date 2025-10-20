'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Calendar, BarChart3, PlayCircle } from "lucide-react"

interface SystemStatus {
  connections?: {
    active?: number
    total?: number
  }
  schedules?: {
    active?: number
    total?: number
  }
  runs?: {
    total?: number
    last24h?: number
  }
  activity?: {
    successRate?: number
    successfulRuns?: number
  }
}

export function SystemStats() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/status')
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
        }
      } catch (error) {
        console.error('[v0] Error fetching system status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Loading data...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-4 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{status?.connections?.active ?? 'N/A'}</div>
          <p className="text-xs text-muted-foreground">
            {status?.connections?.total ?? 'N/A'} total configured
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Scheduled Runs</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{status?.schedules?.active ?? 'N/A'}</div>
          <p className="text-xs text-muted-foreground">
            {status?.schedules?.total ?? 'N/A'} total schedules
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
          <PlayCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{status?.runs?.total ?? 'N/A'}</div>
          <p className="text-xs text-muted-foreground">
            {status?.runs?.last24h ?? 'N/A'} in last 24h
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{status?.activity?.successRate ?? 'N/A'}%</div>
          <p className="text-xs text-muted-foreground">
            {status?.activity?.successfulRuns ?? 'N/A'} successful runs
          </p>
        </CardContent>
      </Card>
    </div>
  )
}