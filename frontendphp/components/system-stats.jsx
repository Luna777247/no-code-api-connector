'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Clock, Zap, CheckCircle } from 'lucide-react'
import apiClient from '../services/apiClient.js'

export function SystemStats() {
  const [stats, setStats] = useState({
    uptime: '--',
    totalRuns: '--',
    last24hRuns: '--',
    successRate: '--',
    activeConnections: '--',
    totalSchedules: '--'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        console.log('[SystemStats] Fetching from /api/status...')
        const response = await apiClient.get('/api/status')
        console.log('[SystemStats] API Response:', response)
        
        const data = response?.data || {}
        console.log('[SystemStats] Extracted data:', data)

        if (data && typeof data === 'object') {
          setStats({
            uptime: data.uptime || '--',
            totalRuns: (data.runs?.total !== undefined) ? data.runs.total.toString() : '--',
            last24hRuns: (data.runs?.last24h !== undefined) ? data.runs.last24h.toString() : '--',
            successRate: (data.activity?.successRate !== undefined) ? data.activity.successRate.toFixed(2) + '%' : '--',
            activeConnections: (data.connections?.active !== undefined) ? data.connections.active.toString() : '--',
            totalSchedules: (data.schedules?.total !== undefined) ? data.schedules.total.toString() : '--'
          })
          console.log('[SystemStats] Stats set successfully')
        } else {
          console.warn('[SystemStats] Invalid data structure:', data)
        }
      } catch (error) {
        console.error('[SystemStats] Failed to fetch system stats:', error)
        console.error('[SystemStats] Error response:', error.response?.data)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-6">
      {/* Uptime */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.uptime}</div>
        </CardContent>
      </Card>

      {/* Total Runs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Runs</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalRuns}</div>
        </CardContent>
      </Card>

      {/* Last 24h Runs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">24h Runs</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.last24hRuns}</div>
        </CardContent>
      </Card>

      {/* Success Rate */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.successRate}</div>
        </CardContent>
      </Card>

      {/* Active Connections */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Connections</CardTitle>
            <Zap className="h-4 w-4 text-orange-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeConnections}</div>
        </CardContent>
      </Card>

      {/* Total Schedules */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Schedules</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalSchedules}</div>
        </CardContent>
      </Card>
    </div>
  )
}
