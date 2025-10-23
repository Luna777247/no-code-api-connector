'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Database, Calendar, Activity, Clock, XCircle, Trash2 } from "lucide-react"
import { PageLayout } from "@/components/ui/page-layout"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"

interface Connection {
  id: string
  connectionId: string
  name: string
  description: string
  baseUrl: string
  method: string
  isActive: boolean
  lastRun?: string
  totalRuns: number
  successRate: number
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteWithData, setDeleteWithData] = useState(false)

  useEffect(() => {
    console.log('[v0] Fetching connections from API...')
    fetch('/api/connections')
      .then(res => res.json())
      .then(data => {
        console.log('[v0] Connections fetched:', data)
        setConnections(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('[v0] Error fetching connections:', err)
        setError('Failed to load connections')
        setLoading(false)
      })
  }, [])

  const deleteConnection = async (connectionId: string, deleteData: boolean = false) => {
    setDeletingId(connectionId)
    try {
      console.log('[v0] Deleting connection:', connectionId, { deleteData })
      const response = await fetch(`/api/connections/${connectionId}?deleteData=${deleteData}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        let errorMessage = 'Failed to delete connection'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          // If we can't parse the error response, use the status text
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(`${errorMessage} (${response.status})`)
      }

      const result = await response.json()
      console.log('[v0] Connection deleted successfully:', result)

      // Remove the connection from the local state
      setConnections(connections.filter(conn => conn.id !== connectionId))
      
      // Reset delete with data option
      setDeleteWithData(false)
    } catch (error) {
      console.error('[v0] Error deleting connection:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete connection')
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

        {/* Connections List */}
        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading connections...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error loading connections</h3>
              <p className="text-muted-foreground text-center">{error}</p>
            </CardContent>
          </Card>
        ) : connections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
              <p className="text-muted-foreground text-center mb-4 text-pretty max-w-md">
                Create your first API connection to start extracting data automatically
              </p>
              <Link href="/connections/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Connection
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {connections.map((connection) => {
              const lastRun = connection.lastRun 
                ? new Date(connection.lastRun).toLocaleString() 
                : 'Never'
              
              return (
                <Card key={connection.id} className="hover:border-primary transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle>{connection.name}</CardTitle>
                          <Badge variant={connection.isActive ? "default" : "secondary"}>
                            {connection.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <CardDescription className="text-pretty">{connection.description}</CardDescription>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          ID: {connection.connectionId}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/connections/${connection.connectionId || connection.id}`}>
                          <Button variant="outline" size="sm">
                            Configure
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-destructive hover:text-destructive"
                              disabled={deletingId === connection.id}
                            >
                              {deletingId === connection.id ? (
                                <Clock className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Connection</AlertDialogTitle>
                              <AlertDialogDescription asChild>
                                <div className="space-y-3">
                                  <span>Are you sure you want to delete &ldquo;{connection.name}&rdquo;?</span>
                                  
                                  <div className="flex items-center space-x-2">
                                    <Checkbox 
                                      id={`delete-data-${connection.id}`}
                                      checked={deleteWithData}
                                      onCheckedChange={(checked) => setDeleteWithData(checked as boolean)}
                                    />
                                    <label 
                                      htmlFor={`delete-data-${connection.id}`}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      Also delete all collected data ({connection.totalRuns} runs)
                                    </label>
                                  </div>
                                  
                                  {deleteWithData ? (
                                    <span className="text-sm text-destructive">
                                      ⚠️ Warning: This will permanently delete all data collected by this connection. This action cannot be undone.
                                    </span>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">
                                      Note: Connection configuration will be deleted, but collected data will remain in the database.
                                    </span>
                                  )}
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDeleteWithData(false)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteConnection(connection.id, deleteWithData)}
                                  className="bg-destructive hover:bg-destructive/90 text-black"
                                >
                                  {deleteWithData ? 'Delete Connection & Data' : 'Delete Connection'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm flex-wrap">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Method:</span>
                        <Badge variant="outline">{connection.method}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Total Runs:</span>
                        <span className="font-medium">{connection.totalRuns}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Last Run:</span>
                        <span className="font-medium">{lastRun}</span>
                      </div>
                    </div>
                    {connection.baseUrl && (
                      <div className="mt-3 p-2 bg-muted/50 rounded text-xs font-mono break-all">
                        {connection.baseUrl}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
    </PageLayout>
  )
}
