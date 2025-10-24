'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import apiClient from '../services/apiClient.js'

export function SystemStats() {
  const [stats, setStats] = useState({
    uptime: '--',
    runs: '--'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await apiClient.get('/api/status')
        const data = response?.data || {}

        // Calculate uptime (simplified - in a real app this would come from server)
        const uptime = data.uptime || 'Unknown'

        // Get runs count
        const runsCount = data.runs?.total || 0

        setStats({
          uptime: uptime,
          runs: runsCount.toString()
        })
      } catch (error) {
        console.error('Failed to fetch system stats:', error)
        // Keep default values on error
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <Card suppressHydrationWarning={true}>
      <CardHeader suppressHydrationWarning={true}>
        <CardTitle>System Stats</CardTitle>
      </CardHeader>
      <CardContent suppressHydrationWarning={true}>
        <div suppressHydrationWarning={true}>Uptime: {stats.uptime}</div>
        <div suppressHydrationWarning={true}>Runs: {stats.runs}</div>
      </CardContent>
    </Card>
  )
}
