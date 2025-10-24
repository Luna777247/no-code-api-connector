"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Play, Pause, Trash2, MoreVertical, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageLayout } from "@/components/ui/page-layout"
import { fetchWithErrorHandling } from "@/lib/fetch-utils"

interface Schedule {
  id: string
  _id?: string
  connectionName: string
  scheduleType: string
  cronExpression: string
  isActive: boolean
  nextRun: string
  lastRun: string | null
  lastStatus: string
  totalRuns: number
}

interface SchedulesResponse {
  schedules?: Schedule[]
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSchedules = async () => {
      const { data, error: fetchError } = await fetchWithErrorHandling<SchedulesResponse>(
        "/api/scheduler",
        { cacheTTL: 3 * 60 * 1000 }, // Cache for 3 minutes
      )

      if (fetchError) {
        console.error("[v0] Error fetching schedules:", fetchError)
        setError(fetchError.message)
      } else if (data) {
        const mappedData = (data.schedules || []).map((schedule: Schedule) => ({
          ...schedule,
          id: schedule._id || schedule.id,
        }))
        setSchedules(mappedData)
      }
      setLoading(false)
    }

    fetchSchedules()
  }, [])

  if (loading) {
    return (
      <PageLayout
        title="Schedules"
        description="Manage automated API runs and schedules"
        showBackButton={true}
        headerActions={
          <Link href="/connections/new">
            <Button className="gap-2" disabled>
              <Calendar className="h-4 w-4" />
              Create Schedule
            </Button>
          </Link>
        }
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading schedules...</span>
        </div>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout
        title="Schedules"
        description="Manage automated API runs and schedules"
        showBackButton={true}
        headerActions={
          <Link href="/connections/new">
            <Button className="gap-2">
              <Calendar className="h-4 w-4" />
              Create Schedule
            </Button>
          </Link>
        }
      >
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-destructive mb-4">⚠️ Error loading schedules</div>
            <p className="text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Schedules"
      description="Manage automated API runs and schedules"
      showBackButton={true}
      headerActions={
        <Link href="/connections/new">
          <Button className="gap-2">
            <Calendar className="h-4 w-4" />
            Create Schedule
          </Button>
        </Link>
      }
    >
      {/* Schedules List */}
      {schedules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No schedules configured</h3>
            <p className="text-muted-foreground text-center mb-4 text-pretty max-w-md">
              Create an API connection with automated scheduling to see it here
            </p>
            <Link href="/connections/new">
              <Button>Create Connection</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{schedule.connectionName}</CardTitle>
                      <Badge variant={schedule.isActive ? "default" : "secondary"}>
                        {schedule.isActive ? "Active" : "Paused"}
                      </Badge>
                      <Badge variant="outline">{schedule.scheduleType}</Badge>
                    </div>
                    <CardDescription>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{schedule.cronExpression}</code>
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Play className="h-4 w-4 mr-2" />
                        Run Now
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause Schedule
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Schedule
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Next Run</p>
                      <p className="text-sm font-medium">{new Date(schedule.nextRun).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Last Run</p>
                      <p className="text-sm font-medium">
                        {schedule.lastRun ? new Date(schedule.lastRun).toLocaleString() : "Never"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Status</p>
                    <Badge variant={schedule.lastStatus === "success" ? "default" : "destructive"} className="mt-1">
                      {schedule.lastStatus}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Runs</p>
                    <p className="text-sm font-medium mt-1">{schedule.totalRuns}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
