import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Play, Pause, Trash2, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function SchedulesPage() {
  // Mock data
  const schedules = [
    {
      id: "1",
      connectionName: "JSONPlaceholder Users API",
      scheduleType: "daily",
      cronExpression: "0 0 * * *",
      isActive: true,
      nextRun: new Date(Date.now() + 86400000),
      lastRun: new Date(Date.now() - 3600000),
      lastStatus: "success",
      totalRuns: 45,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Schedules</h1>
            <p className="text-muted-foreground mt-1">Manage automated API runs and schedules</p>
          </div>
          <Link href="/connections/new">
            <Button className="gap-2">
              <Calendar className="h-4 w-4" />
              Create Schedule
            </Button>
          </Link>
        </div>

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
                        <p className="text-sm font-medium">{schedule.nextRun.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Last Run</p>
                        <p className="text-sm font-medium">{schedule.lastRun.toLocaleString()}</p>
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
      </div>
    </div>
  )
}
