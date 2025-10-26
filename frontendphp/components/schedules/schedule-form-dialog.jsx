"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import apiClient from "../../services/apiClient.js"

export function ScheduleFormDialog({ schedule, onSave, trigger }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [connections, setConnections] = useState([])
  const [formData, setFormData] = useState(
    schedule || {
      connectionId: "",
      connectionName: "",
      description: "",
      scheduleType: "cron",
      cronExpression: "0 0 * * *",
      isActive: true,
    },
  )

  useEffect(() => {
    if (open) {
      fetchConnections()
    }
    // Reset form data when dialog opens with a schedule
    if (schedule) {
      setFormData({
        connectionId: schedule.connectionId || "",
        connectionName: schedule.connectionName || "",
        description: schedule.description || "",
        scheduleType: schedule.scheduleType || "cron",
        cronExpression: schedule.cronExpression || "0 0 * * *",
        isActive: schedule.isActive ?? true,
      })
    } else {
      setFormData({
        connectionId: "",
        connectionName: "",
        description: "",
        scheduleType: "cron",
        cronExpression: "0 0 * * *",
        isActive: true,
      })
    }
  }, [open, schedule])

  const fetchConnections = async () => {
    try {
      const response = await apiClient.get("/api/connections")
      setConnections(response.data || [])
    } catch (err) {
      console.error("[v0] Error fetching connections:", err)
    }
  }

  const handleConnectionChange = (connectionId) => {
    const connection = connections.find(c => c.id === connectionId || c._id === connectionId)
    setFormData({
      ...formData,
      connectionId: connectionId,
      connectionName: connection ? connection.name || connection.connectionName || `${connection.method} ${connection.endpoint}` : "",
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (schedule?.id) {
        await apiClient.put(`/api/schedules/${schedule.id}`, formData)
      } else {
        await apiClient.post("/api/schedules", formData)
      }
      setOpen(false)
      onSave?.()
    } catch (err) {
      console.error("[v0] Error saving schedule:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{schedule ? "Edit Schedule" : "Create Schedule"}</DialogTitle>
          <DialogDescription>
            {schedule ? "Update schedule configuration" : "Create a new automated schedule"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="connectionId">Connection</Label>
            <Select
              value={formData.connectionId}
              onValueChange={handleConnectionChange}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a connection" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((connection) => (
                  <SelectItem key={connection.id || connection._id} value={connection.id || connection._id}>
                    {connection.name || connection.connectionName || `${connection.method} ${connection.endpoint}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="scheduleType">Schedule Type</Label>
            <Select
              value={formData.scheduleType}
              onValueChange={(value) => setFormData({ ...formData, scheduleType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cron">Cron Expression</SelectItem>
                <SelectItem value="interval">Interval</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="cronExpression">Cron Expression</Label>
            <Input
              id="cronExpression"
              value={formData.cronExpression}
              onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
              placeholder="0 0 * * *"
            />
            <p className="text-xs text-muted-foreground mt-1">Format: minute hour day month weekday</p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
