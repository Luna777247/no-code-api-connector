'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Dynamic import the smart travel dashboard
const SmartTravelDashboard = dynamic(
  () => import('./smart-travel-dashboard'),
  {
    ssr: false,
    loading: () => (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>API Analytics Dashboard</CardTitle>
          <CardDescription>Loading dashboard...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-[200px]" />
              <Skeleton className="h-[200px]" />
              <Skeleton className="h-[200px]" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
)

export function EmbeddedDashboard() {
  return (
    <div className="w-full">
      <SmartTravelDashboard />
    </div>
  )
}