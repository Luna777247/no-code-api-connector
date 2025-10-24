import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SystemStats() {
  return (
    <Card suppressHydrationWarning={true}>
      <CardHeader suppressHydrationWarning={true}>
        <CardTitle>System Stats</CardTitle>
      </CardHeader>
      <CardContent suppressHydrationWarning={true}>
        <div suppressHydrationWarning={true}>Uptime: --</div>
        <div suppressHydrationWarning={true}>Runs: --</div>
      </CardContent>
    </Card>
  )
}
