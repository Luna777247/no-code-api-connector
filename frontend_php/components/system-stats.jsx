import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SystemStats() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div>Uptime: --</div>
        <div>Runs: --</div>
      </CardContent>
    </Card>
  )
}
