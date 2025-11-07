'use client'

import SmartTravelDashboard from '@/components/dashboard/smart-travel-dashboard'
import { BackToHomeButton } from '@/components/ui/back-to-home-button'

export default function SmartTravelDashboardPage() {
  return (
    <div>
      <div className="p-4">
        <BackToHomeButton />
      </div>
      <SmartTravelDashboard />
    </div>
  )
}
