'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Database, Calendar, Activity, Clock, XCircle, Trash2 } from "lucide-react"
import { PageLayout } from "@/components/ui/page-layout"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import apiClient from "../../services/apiClient.js"

export default function ConnectionsPage() {
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await apiClient.get('/api/connections')
        const data = res.data || []
        // Ensure data is always an array
        const connectionsArray = Array.isArray(data) ? data : []
        setConnections(connectionsArray)
      } catch (err) {
        console.error('[v0] Error fetching connections:', err)
        setError('Failed to load connections')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const deleteConnection = async (connectionId, deleteData = false) => {
    setDeletingId(connectionId)
    try {
      // For now, just delete the connection (deleteData parameter not implemented in backend)
      const res = await apiClient.delete(`/api/connections/${connectionId}`)
      // Check if response is successful (status 2xx or has ok: true)
      if (res.status >= 200 && res.status < 300 && (!res.data || res.data.ok !== false)) {
        setConnections(connections.filter(conn => conn.id !== connectionId))
      } else {
        throw new Error('Failed to delete connection')
      }
    } catch (err) {
      console.error('[v0] Error deleting connection:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete connection')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PageLayout
      title="API Connections"
      description="Manage your API integrations and configurations"
      showBackButton={true}
      headerActions={
        <Link href="/connections/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Connection
          </Button>
        </Link>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground" suppressHydrationWarning={true}>Loading...</div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="py-12 text-center" suppressHydrationWarning={true}>
            <div className="text-destructive mb-4">⚠️ Error loading connections</div>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4" suppressHydrationWarning={true}>
          {connections.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12" suppressHydrationWarning={true}>
                <Database className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No connections found</h3>
                <p className="text-muted-foreground text-center mb-4">Create your first API connection</p>
                <Link href="/connections/new">
                  <Button>Create Connection</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            connections.map((conn, index) => (
              <Card key={`${conn.id}-${index}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{conn.name}</CardTitle>
                        <Badge variant={conn.isActive ? "default" : "secondary"}>
                          {conn.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <CardDescription>
                        {conn.description || 'No description'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/connections/${conn.id}`}>
                        <Button variant="outline" size="sm">Details</Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            {deletingId === conn.id ? (
                              <Clock className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            <span className="ml-2">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete connection?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the connection.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteConnection(conn.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      )}
    </PageLayout>
  )
}
