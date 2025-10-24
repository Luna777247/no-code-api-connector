"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, Play, Pause, Trash2, Edit2, Plus, Loader2, AlertCircle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { PageLayout } from "@/components/ui/page-layout"
import apiClient from "../../services/apiClient.js"
import { ScheduleFormDialog } from "@/components/schedules/schedule-form-dialog.jsx"

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [actioningId, setActioningId] = useState(null)
  const [editingSchedule, setEditingSchedule] = useState(null)

  useEffect(() => {
    fetchSchedules()
  }, [])

  async function fetchSchedules() {
    try {
      setLoading(true)
      const response = await apiClient.get("/api/schedules")
      const data = response.data
      const mappedData = (data || []).map((schedule) => ({
        ...schedule,
        id: schedule._id || schedule.id,
      }))
      setSchedules(mappedData)
    } catch (err) {
      console.error("[v0] Error fetching schedules:", err)
      setError(err instanceof Error ? err.message : "Failed to load schedules")
    } finally {
      setLoading(false)
    }
  }

  const runNow = async (scheduleId) => {
    setActioningId(scheduleId)
    try {
      await apiClient.post(`/api/schedules/${scheduleId}/trigger`, {})
      fetchSchedules()
    } catch (err) {
      console.error("[v0] Error running schedule:", err)
      setError("Failed to run schedule")
    } finally {
      setActioningId(null)
    }
  }

  const pauseSchedule = async (scheduleId) => {
    setActioningId(scheduleId)
    try {
      await apiClient.put(`/api/schedules/${scheduleId}`, { isActive: false })
      fetchSchedules()
    } catch (err) {
      console.error("[v0] Error pausing schedule:", err)
      setError("Failed to pause schedule")
    } finally {
      setActioningId(null)
    }
  }

  const resumeSchedule = async (scheduleId) => {
    setActioningId(scheduleId)
    try {
      await apiClient.put(`/api/schedules/${scheduleId}`, { isActive: true })
      fetchSchedules()
    } catch (err) {
      console.error("[v0] Error resuming schedule:", err)
      setError("Failed to resume schedule")
    } finally {
      setActioningId(null)
    }
  }

  const deleteSchedule = async (scheduleId) => {
    setActioningId(scheduleId)
    try {
      await apiClient.delete(`/api/schedules/${scheduleId}`)
      setSchedules(schedules.filter((s) => s.id !== scheduleId))
    } catch (err) {
      console.error("[v0] Error deleting schedule:", err)
      setError("Failed to delete schedule")
    } finally {
      setActioningId(null)
    }
  }

  const filteredSchedules = schedules.filter(
    (s) =>
      s.connectionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <PageLayout
        title="Schedules"
        description="Manage automated API runs and schedules"
        showBackButton={true}
        headerActions={
          <ScheduleFormDialog
            schedule={null}
            onSave={fetchSchedules}
            trigger={
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Schedule
              </Button>
            }
          />
        }
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading schedules...</span>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Schedules"
      description="Manage automated API runs and schedules"
      showBackButton={true}
      headerActions={
        <ScheduleFormDialog
          schedule={editingSchedule}
          onSave={() => {
            setEditingSchedule(null)
            fetchSchedules()
          }}
          trigger={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Schedule
            </Button>
          }
        />
      }
    >
      {error && (
        <Card className="border-destructive mb-6">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="mb-6">
        <Input
          placeholder="Search schedules..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredSchedules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No schedules configured</h3>
            <p className="text-muted-foreground text-center mb-4 text-pretty max-w-md">
              Create a schedule to automate your API runs
            </p>
            <ScheduleFormDialog schedule={null} onSave={fetchSchedules} trigger={<Button>Create Schedule</Button>} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSchedules.map((schedule) => (
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => runNow(schedule.id)}
                      disabled={actioningId === schedule.id}
                      className="gap-1"
                    >
                      {actioningId === schedule.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">Run</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => (schedule.isActive ? pauseSchedule(schedule.id) : resumeSchedule(schedule.id))}
                      disabled={actioningId === schedule.id}
                      className="gap-1"
                    >
                      {actioningId === schedule.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : schedule.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">{schedule.isActive ? "Pause" : "Resume"}</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingSchedule(schedule)} className="gap-1">
                      <Edit2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive gap-1">
                          {actioningId === schedule.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. The schedule "{schedule.connectionName}" will be permanently
                            deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteSchedule(schedule.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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
